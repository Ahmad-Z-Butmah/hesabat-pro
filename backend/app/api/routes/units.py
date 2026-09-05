import re

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.parking import ParkingSpot
from app.models.project import Project
from app.models.unit import Unit, UnitStatus, UnitType
from app.models.user import User
from app.schemas.unit import PropertySetupIn, PropertySetupOut, UnitCreate, UnitRead, UnitUpdate

router = APIRouter(prefix="/units", tags=["الشقق والوحدات"])
property_setup_router = APIRouter(prefix="/projects", tags=["إعداد العقار"])


def _get_owned_project(db: Session, project_id: int, user: User) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    if project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="غير مخوّل")
    return project


UNIT_TYPE_ORDER = [UnitType.apartment, UnitType.roof, UnitType.storage, UnitType.studio]


def _code_number(code: str | None) -> int | None:
    if code is None:
        return None
    m = re.search(r"\d+", str(code))
    return int(m.group(0)) if m else None


def _unit_no_sort_key(unit: Unit):
    no = _code_number(unit.no)
    return (0, no) if no is not None else (1, 0)


def build_assigned_parking_map(project_units: list[Unit]) -> dict[int, int]:
    """unit_id -> رقم الموقف المخصص. ترتيب الأنواع ثابت وكل نوع يأخذ Range متتالي من أرقام المواقف."""
    result: dict[int, int] = {}
    offset = 0
    for unit_type in UNIT_TYPE_ORDER:
        typed = sorted([u for u in project_units if u.unit_type == unit_type], key=_unit_no_sort_key)
        for i, u in enumerate(typed):
            result[u.id] = offset + i + 1
        offset += len(typed)
    return result


def compute_assigned_parking_no(project_units: list[Unit], unit: Unit) -> int | None:
    return build_assigned_parking_map(project_units).get(unit.id)


def _find_parking_by_no(db: Session, project_id: int, parking_no: int) -> ParkingSpot | None:
    spots = db.query(ParkingSpot).filter(ParkingSpot.project_id == project_id).all()
    for spot in spots:
        if _code_number(spot.code) == parking_no:
            return spot
    return None


def _assign_parking_on_sale(db: Session, unit: Unit) -> None:
    project_units = db.query(Unit).filter(Unit.project_id == unit.project_id).all()
    assigned_no = compute_assigned_parking_no(project_units, unit)
    if assigned_no is None:
        raise HTTPException(status_code=409, detail="لا يمكن تحديد موقف مخصص لهذه الوحدة ضمن إعدادات العقار.")

    target = _find_parking_by_no(db, unit.project_id, assigned_no)
    if target is None:
        raise HTTPException(status_code=409, detail="لا يوجد موقف مخصص لهذه الوحدة ضمن إعدادات العقار.")

    existing_link = db.query(ParkingSpot).filter(ParkingSpot.unit_id == unit.id).first()
    if existing_link is not None and existing_link.id != target.id:
        raise HTTPException(status_code=409, detail="الوحدة مرتبطة أصلًا بموقف آخر. افصل الربط أولًا.")
    if target.unit_id is not None and target.unit_id != unit.id:
        raise HTTPException(status_code=409, detail="الموقف المخصص مرتبط بوحدة أخرى.")

    target.unit_id = unit.id
    target.is_sold = True


def _release_parking_on_return(db: Session, unit: Unit) -> None:
    linked = db.query(ParkingSpot).filter(ParkingSpot.unit_id == unit.id).first()
    if linked is not None:
        linked.unit_id = None
        linked.is_sold = False


@router.get("", response_model=list[UnitRead])
def list_units(
    project_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Unit)
    if project_id is not None:
        _get_owned_project(db, project_id, current_user)
        query = query.filter(Unit.project_id == project_id)
    units = query.order_by(Unit.floor, Unit.no).all()
    if project_id is not None:
        parking_map = build_assigned_parking_map(units)
        for u in units:
            u.assigned_parking_no = parking_map.get(u.id)
    return units


@router.post("", response_model=UnitRead, status_code=201)
def create_unit(
    unit_in: UnitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_project(db, unit_in.project_id, current_user)
    unit = Unit(**unit_in.model_dump())
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.get("/{unit_id}", response_model=UnitRead)
def get_unit(unit_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    unit = db.get(Unit, unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="الوحدة غير موجودة")
    _get_owned_project(db, unit.project_id, current_user)
    return unit


@router.patch("/{unit_id}", response_model=UnitRead)
def update_unit(
    unit_id: int,
    unit_in: UnitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    unit = db.get(Unit, unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="الوحدة غير موجودة")
    _get_owned_project(db, unit.project_id, current_user)

    data = unit_in.model_dump(exclude_unset=True)
    new_status = data.get("status", unit.status)
    old_status = unit.status

    for field, value in data.items():
        setattr(unit, field, value)

    if new_status != old_status:
        if new_status == UnitStatus.sold:
            _assign_parking_on_sale(db, unit)
        elif old_status == UnitStatus.sold:
            _release_parking_on_return(db, unit)

    db.commit()
    db.refresh(unit)
    return unit


@router.delete("/{unit_id}", status_code=204)
def delete_unit(unit_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    unit = db.get(Unit, unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="الوحدة غير موجودة")
    _get_owned_project(db, unit.project_id, current_user)
    linked = db.query(ParkingSpot).filter(ParkingSpot.unit_id == unit.id).count()
    if linked:
        raise HTTPException(status_code=409, detail="لا يمكن حذف الوحدة لأنها مرتبطة بموقف. افصل الموقف عن الوحدة أولًا.")
    db.delete(unit)
    db.commit()


@property_setup_router.post("/{project_id}/property-setup", response_model=PropertySetupOut, status_code=201)
def property_setup(
    project_id: int,
    payload: PropertySetupIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_project(db, project_id, current_user)
    has_units = db.query(Unit).filter(Unit.project_id == project_id).count()
    has_spots = db.query(ParkingSpot).filter(ParkingSpot.project_id == project_id).count()
    if has_units or has_spots:
        raise HTTPException(
            status_code=409,
            detail="تم إعداد العقار مسبقًا. لا يمكن تنفيذ إعداد مكرر فوق بيانات موجودة.",
        )

    try:
        for i in range(1, payload.apartments_count + 1):
            db.add(Unit(
                project_id=project_id,
                no=f"شقة {i}",
                floor=0,
                status=UnitStatus.available,
                unit_type=UnitType.apartment,
                area=payload.default_apartment_area,
            ))
        for i in range(1, payload.roofs_count + 1):
            db.add(Unit(
                project_id=project_id,
                no=f"روف {i}",
                floor=0,
                status=UnitStatus.available,
                unit_type=UnitType.roof,
            ))
        for i in range(1, payload.storages_count + 1):
            db.add(Unit(
                project_id=project_id,
                no=f"مخزن {i}",
                floor=0,
                status=UnitStatus.available,
                unit_type=UnitType.storage,
            ))
        for i in range(1, payload.studios_count + 1):
            db.add(Unit(
                project_id=project_id,
                no=f"استوديو {i}",
                floor=0,
                status=UnitStatus.available,
                unit_type=UnitType.studio,
            ))
        for i in range(1, payload.parking_count + 1):
            db.add(ParkingSpot(
                project_id=project_id,
                code=f"موقف {i}",
                is_visitor=False,
                is_sold=False,
                unit_id=None,
            ))
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="فشل إنشاء مكونات العقار. لم يتم حفظ أي تغيير.")

    return PropertySetupOut(
        apartments=payload.apartments_count,
        roofs=payload.roofs_count,
        storages=payload.storages_count,
        studios=payload.studios_count,
        parking=payload.parking_count,
    )
