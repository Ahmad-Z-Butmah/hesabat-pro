from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.parking import ParkingSpot
from app.models.project import Project
from app.models.user import User
from app.schemas.parking import ParkingSpotCreate, ParkingSpotRead, ParkingSpotUpdate

router = APIRouter(prefix="/parking-spots", tags=["المواقف"])


def _get_owned_project(db: Session, project_id: int, user: User) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    if project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="غير مخوّل")
    return project


@router.get("", response_model=list[ParkingSpotRead])
def list_parking_spots(
    project_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_project(db, project_id, current_user)
    return (
        db.query(ParkingSpot)
        .filter(ParkingSpot.project_id == project_id)
        .order_by(ParkingSpot.code)
        .all()
    )


@router.post("", response_model=ParkingSpotRead, status_code=201)
def create_parking_spot(
    spot_in: ParkingSpotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_project(db, spot_in.project_id, current_user)
    spot = ParkingSpot(**spot_in.model_dump())
    db.add(spot)
    db.commit()
    db.refresh(spot)
    return spot


@router.patch("/{spot_id}", response_model=ParkingSpotRead)
def update_parking_spot(
    spot_id: int,
    spot_in: ParkingSpotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    spot = db.get(ParkingSpot, spot_id)
    if not spot:
        raise HTTPException(status_code=404, detail="الموقف غير موجود")
    _get_owned_project(db, spot.project_id, current_user)
    for field, value in spot_in.model_dump(exclude_unset=True).items():
        setattr(spot, field, value)
    db.commit()
    db.refresh(spot)
    return spot


@router.delete("/{spot_id}", status_code=204)
def delete_parking_spot(spot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    spot = db.get(ParkingSpot, spot_id)
    if not spot:
        raise HTTPException(status_code=404, detail="الموقف غير موجود")
    _get_owned_project(db, spot.project_id, current_user)
    if spot.unit_id is not None:
        raise HTTPException(status_code=409, detail="لا يمكن حذف الموقف لأنه مرتبط بوحدة. افصل الموقف عن الوحدة أولًا.")
    db.delete(spot)
    db.commit()
