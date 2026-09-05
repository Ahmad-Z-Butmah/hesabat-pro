import logging
import os

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.project import Project
from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.models.transaction_attachment import TransactionAttachment
from app.models.user import User
from app.schemas.transaction import TransactionCreate, TransactionRead, TransactionUpdate

router = APIRouter(prefix="/transactions", tags=["الحركات المالية"])

logger = logging.getLogger(__name__)


def _get_project_for_user(transaction_id: int, db: Session, user: User) -> Transaction:
    tx = db.get(Transaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="الحركة المالية غير موجودة")
    project = db.get(Project, tx.project_id)
    if not project or project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="غير مخوّل للوصول إلى هذه الحركة")
    return tx


def _get_linked_transactions(db: Session, transaction_id: int, user: User) -> list[Transaction]:
    return (
        db.query(Transaction)
        .join(Project)
        .filter(Project.owner_id == user.id, Transaction.source_transaction_id == transaction_id)
        .order_by(Transaction.id.asc())
        .all()
    )


def _linked_transactions_detail(linked: list[Transaction]) -> dict:
    return {
        "code": "TRANSACTION_HAS_LINKED_RECORDS",
        "message": "This transaction cannot be deleted because it is linked to other transactions.",
        "linked_transactions_count": len(linked),
        "linked_transactions": [
            {
                "id": t.id,
                "type": getattr(t.type, "value", t.type),
                "check_no": t.check_no,
                "amount": str(t.amount) if t.amount is not None else None,
                "party_name": t.party_name,
                "status": getattr(t.status, "value", t.status),
                "due_date": t.due_date.isoformat() if t.due_date else None,
            }
            for t in linked
        ],
    }


def _is_foreign_key_violation(exc: IntegrityError) -> bool:
    orig = exc.orig
    if orig is None:
        return False
    sqlstate = getattr(orig, "sqlstate", None)
    if sqlstate:
        return sqlstate == "23503"
    return getattr(orig, "pgcode", None) == "23503"


@router.get("", response_model=list[TransactionRead])
def list_transactions(
    project_id: int | None = Query(default=None),
    party_id: int | None = Query(default=None),
    type: TransactionType | None = Query(default=None),
    status: TransactionStatus | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Transaction).join(Project).filter(Project.owner_id == current_user.id)
    if project_id is not None:
        query = query.filter(Transaction.project_id == project_id)
    if party_id is not None:
        query = query.filter(Transaction.party_id == party_id)
    if type is not None:
        query = query.filter(Transaction.type == type)
    if status is not None:
        query = query.filter(Transaction.status == status)

    if type == TransactionType.check_in and status == TransactionStatus.pending:
        used_ids = (
            db.query(Transaction.source_transaction_id)
            .filter(
                Transaction.type == TransactionType.check_out,
                Transaction.source_transaction_id.isnot(None),
            )
            .all()
        )
        used_ids = {row[0] for row in used_ids}
        query = query.filter(~Transaction.id.in_(used_ids)) if used_ids else query

    return query.order_by(Transaction.sequence_number.desc()).all()


@router.post("", response_model=TransactionRead, status_code=201)
def create_transaction(
    tx_in: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, tx_in.project_id)
    if not project or project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="غير مخوّل لإضافة حركة لهذا المشروع")
    tx = Transaction(**tx_in.model_dump())
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@router.get("/{transaction_id}", response_model=TransactionRead)
def get_transaction(transaction_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _get_project_for_user(transaction_id, db, current_user)


@router.patch("/{transaction_id}", response_model=TransactionRead)
def update_transaction(
    transaction_id: int,
    tx_in: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_project_for_user(transaction_id, db, current_user)
    tx = db.get(Transaction, transaction_id)
    for field, value in tx_in.model_dump(exclude_unset=True).items():
        setattr(tx, field, value)
    db.commit()
    db.refresh(tx)
    return tx


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_project_for_user(transaction_id, db, current_user)
    tx = db.get(Transaction, transaction_id)

    linked = _get_linked_transactions(db, transaction_id, current_user)
    if linked:
        raise HTTPException(status_code=409, detail=_linked_transactions_detail(linked))

    try:
        db.delete(tx)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        logger.error("Failed to delete transaction %s: %s", transaction_id, exc)
        if not _is_foreign_key_violation(exc):
            raise
        raise HTTPException(
            status_code=409,
            detail={
                "code": "TRANSACTION_HAS_LINKED_RECORDS",
                "message": "This transaction cannot be deleted because it is linked to other transactions.",
            },
        )


@router.get("/{transaction_id}/attachments/{attachment_id}/download")
def download_attachment(
    transaction_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tx = _get_project_for_user(transaction_id, db, current_user)
    attachment = db.get(TransactionAttachment, attachment_id)
    if not attachment or attachment.transaction_id != transaction_id:
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    if not os.path.isfile(attachment.file_path):
        raise HTTPException(status_code=404, detail="الملف غير موجود على الخادم")
    return FileResponse(attachment.file_path, media_type=attachment.mime_type, filename=attachment.original_name)
