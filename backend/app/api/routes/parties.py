from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.party import Party
from app.models.project import Project
from app.models.transaction import Transaction, TransactionType
from app.models.unit_sale import UnitSale
from app.models.user import User
from app.schemas.party import PartyCreate, PartyRead, PartySummary, PartyUpdate
from app.schemas.transaction import TransactionRead

router = APIRouter(prefix="/parties", tags=["الأطراف (عملاء ومقاولون وموردون)"])
project_parties_router = APIRouter(prefix="/projects/{project_id}/parties", tags=["الأطراف (ملخص المشروع)"])


def _get_party_for_user(party_id: int, db: Session, user: User) -> Party:
    party = db.get(Party, party_id)
    if not party:
        raise HTTPException(status_code=404, detail="الطرف غير موجود")
    project = db.get(Project, party.project_id)
    if not project or project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="غير مخوّل للوصول إلى هذا الطرف")
    return party


@router.get("", response_model=list[PartyRead])
def list_parties(
    project_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Party).join(Project).filter(Project.owner_id == current_user.id)
    if project_id is not None:
        query = query.filter(Party.project_id == project_id)
    return query.order_by(Party.name).all()


@router.post("", response_model=PartyRead, status_code=201)
def create_party(
    party_in: PartyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, party_in.project_id)
    if not project or project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="غير مخوّل لإضافة طرف لهذا المشروع")
    party = Party(**party_in.model_dump())
    db.add(party)
    db.commit()
    db.refresh(party)
    return party


@router.get("/{party_id}", response_model=PartyRead)
def get_party(party_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _get_party_for_user(party_id, db, current_user)


@router.patch("/{party_id}", response_model=PartyRead)
def update_party(
    party_id: int,
    party_in: PartyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    party = _get_party_for_user(party_id, db, current_user)
    changes = party_in.model_dump(exclude_unset=True)
    if "name" in changes:
        name = " ".join((changes["name"] or "").strip().split())
        if not name:
            raise HTTPException(status_code=400, detail="اسم الطرف لا يمكن أن يكون فارغاً")
        duplicate = (
            db.query(Party)
            .filter(
                Party.project_id == party.project_id,
                Party.name == name,
                Party.id != party.id,
            )
            .first()
        )
        if duplicate:
            raise HTTPException(status_code=400, detail="يوجد طرف بنفس الاسم في هذا المشروع")
        changes["name"] = name
    for field, value in changes.items():
        setattr(party, field, value)
    db.commit()
    db.refresh(party)
    return party


@router.delete("/{party_id}", status_code=204)
def delete_party(party_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    party = _get_party_for_user(party_id, db, current_user)
    has_transactions = db.query(Transaction.id).filter(Transaction.party_id == party.id).first() is not None
    if has_transactions:
        raise HTTPException(
            status_code=409,
            detail="لا يمكن حذف هذا الطرف لأنه مرتبط بحركات مالية. يمكنك تعديل بياناته بدلًا من حذفه.",
        )
    db.delete(party)
    db.commit()


def _get_owned_project(project_id: int, db: Session, user: User) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    if project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="غير مخوّل للوصول إلى هذا المشروع")
    return project


@project_parties_router.get("/summary", response_model=list[PartySummary])
def list_parties_summary(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_project(project_id, db, current_user)

    # استبعاد مشتري الوحدات السكنية (هم عملاء الآن) من قائمة الأطراف
    buyer_ids = {
        row[0]
        for row in db.query(UnitSale.buyer_party_id).filter(UnitSale.project_id == project_id).all()
        if row[0] is not None
    }
    parties = (
        db.query(Party)
        .filter(Party.project_id == project_id, ~Party.id.in_(buyer_ids))
        .all()
    )
    project_txs = (
        db.query(Transaction)
        .filter(
            Transaction.project_id == project_id,
            Transaction.party_id.isnot(None),
            ~Transaction.party_id.in_(buyer_ids),
        )
        .all()
    )

    by_party: dict[int, list[Transaction]] = {}
    for t in project_txs:
        by_party.setdefault(t.party_id, []).append(t)

    rows = []
    for party in parties:
        txs = by_party.get(party.id, [])
        cash_received = sum((t.amount for t in txs if t.type == TransactionType.cash_in), Decimal("0.00"))
        cash_paid = sum((t.amount for t in txs if t.type == TransactionType.cash_out), Decimal("0.00"))
        check_received = sum((t.amount for t in txs if t.type == TransactionType.check_in), Decimal("0.00"))
        check_paid = sum((t.amount for t in txs if t.type == TransactionType.check_out), Decimal("0.00"))

        received_total = cash_received + check_received
        paid_total = cash_paid + check_paid
        total_activity = received_total + paid_total
        net_balance = received_total - paid_total
        last_transaction_date = max((t.transaction_date for t in txs), default=None)

        rows.append(
            PartySummary(
                id=party.id,
                project_id=party.project_id,
                name=party.name,
                role=party.role,
                direction=party.direction,
                phone=party.phone,
                transaction_count=len(txs),
                cash_received=cash_received,
                cash_paid=cash_paid,
                check_received=check_received,
                check_paid=check_paid,
                received_total=received_total,
                paid_total=paid_total,
                total_activity=total_activity,
                net_balance=net_balance,
                last_transaction_date=last_transaction_date,
            )
        )

    # total_activity DESC ثم last_transaction_date DESC ثم id DESC
    rows.sort(key=lambda p: (-p.total_activity, -((p.last_transaction_date or date.min).toordinal()), -p.id))
    return rows


@project_parties_router.get("/{party_id}/transactions", response_model=list[TransactionRead])
def list_party_transactions(
    project_id: int,
    party_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_project(project_id, db, current_user)
    party = db.get(Party, party_id)
    if not party or party.project_id != project_id:
        raise HTTPException(status_code=404, detail="الطرف غير موجود في هذا المشروع")
    return (
        db.query(Transaction)
        .filter(Transaction.project_id == project_id, Transaction.party_id == party_id)
        .order_by(
            Transaction.transaction_date.desc(),
            Transaction.created_at.desc(),
            Transaction.id.desc(),
        )
        .all()
    )
