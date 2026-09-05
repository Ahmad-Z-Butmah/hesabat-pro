import os
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.party import Party
from app.models.project import Project
from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.models.transaction_attachment import TransactionAttachment
from app.models.unit import Unit
from app.models.unit_sale import UnitSale
from app.models.user import User
from app.schemas.customer import CustomerRead, CustomerSummary, CustomerUnitRead, CustomerUnitSummary, CustomerUpdate
from app.schemas.transaction import TransactionRead

router = APIRouter(prefix="/projects/{project_id}/customers", tags=["العملاء (مشترو الوحدات)"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "uploads", "transactions")
ALLOWED_MIME = {"image/jpeg", "image/png", "application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024


def _get_owned_project(db: Session, project_id: int, user: User) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    if project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="غير مخوّل للوصول إلى هذا المشروع")
    return project


def _get_buyer_for_user(db: Session, project_id: int, customer_id: int, user: User) -> Party:
    """العميل = مشتري فعلي مرتبط ببيع وحدة داخل المشروع."""
    _get_owned_project(db, project_id, user)
    party = db.get(Party, customer_id)
    if not party or party.project_id != project_id:
        raise HTTPException(status_code=404, detail="العميل غير موجود في هذا المشروع")
    has_sale = (
        db.query(UnitSale.id)
        .filter(UnitSale.project_id == project_id, UnitSale.buyer_party_id == party.id)
        .first()
    )
    if not has_sale:
        raise HTTPException(status_code=404, detail="العميل غير موجود في هذا المشروع")
    return party


def _unit_no(db: Session, unit_id: int) -> str | None:
    unit = db.get(Unit, unit_id)
    return unit.no if unit else None


def _ensure_upload_dir():
    os.makedirs(UPLOAD_DIR, exist_ok=True)


def _txs_for_buyer(txs: list[Transaction], buyer_id: int, sale_ids: set[int]) -> list[Transaction]:
    return [
        t
        for t in txs
        if t.party_id == buyer_id or (t.sale_id is not None and t.sale_id in sale_ids)
    ]


def _build_financials(txs: list[Transaction]):
    """ملخص مالي للعميل: قبض فقط (كاش/تحويل/شيك مستلم) — لا صادر نهائياً."""
    today = date.today()

    cash_received = sum(
        (t.amount for t in txs if t.type == TransactionType.cash_in and t.method != "transfer"),
        Decimal("0.00"),
    )
    transfer_received = sum(
        (t.amount for t in txs if t.type == TransactionType.cash_in and t.method == "transfer"),
        Decimal("0.00"),
    )
    checks = [t for t in txs if t.type == TransactionType.check_in]
    check_received = sum((t.amount for t in checks), Decimal("0.00"))
    pending_checks = [t for t in checks if t.status == TransactionStatus.pending]
    pending_total = sum((t.amount for t in pending_checks), Decimal("0.00"))
    cleared_checks = sum((t.amount for t in checks if t.status == TransactionStatus.cleared), Decimal("0.00"))

    paid_total = cash_received + transfer_received + cleared_checks
    received_total = cash_received + transfer_received + check_received

    due_dates = [t.due_date for t in pending_checks if t.due_date]
    nearest_due_date = min(due_dates) if due_dates else None
    is_overdue = any(d for d in due_dates if d < today)
    last_transaction_date = max((t.transaction_date for t in txs), default=None)

    return {
        "cash_received": cash_received,
        "transfer_received": transfer_received,
        "check_received": check_received,
        "check_count": len(checks),
        "pending_check_total": pending_total,
        "pending_check_count": len(pending_checks),
        "paid_total": paid_total,
        "received_total": received_total,
        "nearest_due_date": nearest_due_date,
        "last_transaction_date": last_transaction_date,
        "is_overdue": is_overdue,
        "transaction_count": len(txs),
    }


def _build_customer_data(db: Session, project_id: int, party: Party, txs: list[Transaction]):
    sales = (
        db.query(UnitSale)
        .filter(UnitSale.project_id == project_id, UnitSale.buyer_party_id == party.id)
        .all()
    )
    sale_ids = {s.id for s in sales}
    financials = _build_financials(txs)

    units = []
    unit_nos = []
    sale_price_total = Decimal("0.00")
    for s in sales:
        unit = s.unit
        unit_no = unit.no if unit else None
        units.append(CustomerUnitSummary(unit_id=s.unit_id, unit_no=unit_no or "", unit_type=unit.unit_type.value if unit and unit.unit_type else None))
        if unit_no:
            unit_nos.append(unit_no)
        sale_price_total += s.sale_price

    remaining_total = max(sale_price_total - financials["paid_total"], Decimal("0.00"))

    return {
        "id": party.id,
        "project_id": project_id,
        "name": party.name,
        "phone": party.phone,
        "units": units,
        "unit_nos": unit_nos,
        "sale_price_total": sale_price_total,
        "paid_total": financials["paid_total"],
        "remaining_total": remaining_total,
        "check_count": financials["check_count"],
        "pending_check_count": financials["pending_check_count"],
        "pending_check_total": financials["pending_check_total"],
        "cash_received": financials["cash_received"],
        "transfer_received": financials["transfer_received"],
        "check_received": financials["check_received"],
        "received_total": financials["received_total"],
        "nearest_due_date": financials["nearest_due_date"],
        "last_transaction_date": financials["last_transaction_date"],
        "is_overdue": financials["is_overdue"],
        "transaction_count": financials["transaction_count"],
    }


def _build_customer_detail(db: Session, project_id: int, party: Party, txs: list[Transaction]) -> dict:
    data = _build_customer_data(db, project_id, party, txs)
    sales = (
        db.query(UnitSale)
        .filter(UnitSale.project_id == project_id, UnitSale.buyer_party_id == party.id)
        .all()
    )
    detail_units: list[CustomerUnitRead] = []
    for s in sales:
        unit = s.unit
        unit_no = unit.no if unit else ""
        detail_units.append(
            CustomerUnitRead(
                unit_id=s.unit_id,
                unit_no=unit_no,
                unit_type=unit.unit_type.value if unit and unit.unit_type else None,
                sale_price=s.sale_price,
                down_payment=s.down_payment,
                sale_date=s.sale_date,
                cheque_count=s.cheque_count,
            )
        )
    data["units"] = detail_units
    return data


def _project_transactions(db: Session, project_id: int) -> list[Transaction]:
    return (
        db.query(Transaction)
        .filter(Transaction.project_id == project_id)
        .order_by(
            Transaction.transaction_date.desc(),
            Transaction.created_at.desc(),
            Transaction.id.desc(),
        )
        .all()
    )


@router.get("", response_model=list[CustomerSummary])
def list_customers(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """مشترو الوحدات الفعليون في هذا المشروع فقط — مشتق من UnitSale وليس من قائمة يدوية."""
    _get_owned_project(db, project_id, current_user)

    sales = db.query(UnitSale).filter(UnitSale.project_id == project_id).all()
    by_buyer: dict[int, list[UnitSale]] = {}
    for s in sales:
        by_buyer.setdefault(s.buyer_party_id, []).append(s)

    if not by_buyer:
        return []

    buyer_ids = list(by_buyer.keys())
    parties = {
        p.id: p
        for p in db.query(Party).filter(Party.project_id == project_id, Party.id.in_(buyer_ids)).all()
    }

    project_txs = _project_transactions(db, project_id)
    all_sale_ids = {s.id for s in sales}

    rows = []
    for buyer_id, buyer_sales in by_buyer.items():
        party = parties.get(buyer_id)
        if not party:
            continue
        sale_ids = {s.id for s in buyer_sales}
        txs = _txs_for_buyer(project_txs, buyer_id, sale_ids)
        data = _build_customer_data(db, project_id, party, txs)
        rows.append(CustomerSummary(**data))

    rows.sort(key=lambda c: (-c.sale_price_total, -c.transaction_count, -c.id))
    return rows


@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer(
    project_id: int,
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    party = _get_buyer_for_user(db, project_id, customer_id, current_user)
    txs = _txs_for_buyer(
        _project_transactions(db, project_id),
        party.id,
        {s.id for s in db.query(UnitSale).filter(UnitSale.buyer_party_id == party.id).all()},
    )
    data = _build_customer_detail(db, project_id, party, txs)
    return CustomerRead(**data)


@router.patch("/{customer_id}", response_model=CustomerRead)
def update_customer(
    project_id: int,
    customer_id: int,
    customer_in: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    party = _get_buyer_for_user(db, project_id, customer_id, current_user)
    changes = customer_in.model_dump(exclude_unset=True)

    if "name" in changes:
        name = " ".join((changes["name"] or "").strip().split())
        if not name:
            raise HTTPException(status_code=400, detail="اسم العميل لا يمكن أن يكون فارغاً")
        changes["name"] = name

    for field, value in changes.items():
        setattr(party, field, value)
    db.commit()
    db.refresh(party)

    txs = _txs_for_buyer(
        _project_transactions(db, project_id),
        party.id,
        {s.id for s in db.query(UnitSale).filter(UnitSale.buyer_party_id == party.id).all()},
    )
    data = _build_customer_detail(db, project_id, party, txs)
    return CustomerRead(**data)


@router.get("/{customer_id}/transactions", response_model=list[TransactionRead])
def list_customer_transactions(
    project_id: int,
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    party = _get_buyer_for_user(db, project_id, customer_id, current_user)
    return _txs_for_buyer(
        _project_transactions(db, project_id),
        party.id,
        {s.id for s in db.query(UnitSale).filter(UnitSale.buyer_party_id == party.id).all()},
    )


@router.post("/{customer_id}/transactions", response_model=TransactionRead, status_code=201)
async def create_customer_transaction(
    project_id: int,
    customer_id: int,
    type: str = Form(...),
    amount: str = Form(...),
    transaction_date: str = Form(...),
    method: str = Form("cash"),
    note: str = Form(None),
    check_no: str = Form(None),
    bank: str = Form(None),
    branch: str = Form(None),
    due_date: str = Form(None),
    files: list[UploadFile] = Form(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    party = _get_buyer_for_user(db, project_id, customer_id, current_user)

    try:
        txn_type = TransactionType(type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"نوع الحركة غير صالح: {type}")

    if txn_type not in (TransactionType.cash_in, TransactionType.check_in):
        raise HTTPException(
            status_code=400,
            detail="سجل العميل يقبل المقبوضات فقط: كاش مستلم، تحويل مستلم، شيك مستلم.",
        )

    if txn_type == TransactionType.cash_in and method not in ("cash", "transfer"):
        raise HTTPException(status_code=400, detail="طريقة التحصيل يجب أن تكون cash أو transfer")

    parsed_amount = Decimal(str(amount))
    if parsed_amount <= 0:
        raise HTTPException(status_code=400, detail="المبلغ يجب أن يكون أكبر من صفر")

    parsed_date = date.fromisoformat(transaction_date)
    parsed_due_date = date.fromisoformat(due_date) if due_date else None

    for f in files:
        if f.content_type not in ALLOWED_MIME:
            raise HTTPException(
                status_code=400,
                detail=f"نوع الملف غير مسموح: {f.filename} ({f.content_type})",
            )

    is_check = txn_type == TransactionType.check_in
    tx = Transaction(
        project_id=project_id,
        party_id=party.id,
        type=txn_type,
        method=method if not is_check else None,
        status=TransactionStatus.pending if is_check else TransactionStatus.cleared,
        amount=parsed_amount,
        transaction_date=parsed_date,
        check_no=check_no if is_check else None,
        bank=bank if is_check else None,
        branch=branch if is_check else None,
        due_date=parsed_due_date if is_check else None,
        note=note,
        has_attachment=len(files) > 0,
    )
    db.add(tx)
    db.flush()

    saved_paths = []
    try:
        _ensure_upload_dir()
        for f in files:
            content = await f.read()
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"حجم الملف يتجاوز 10MB: {f.filename}",
                )
            import uuid

            ext = os.path.splitext(f.filename or "")[1] or ""
            stored_name = f"{uuid.uuid4().hex}{ext}"
            file_path = os.path.join(UPLOAD_DIR, stored_name)
            with open(file_path, "wb") as out:
                out.write(content)
            saved_paths.append(file_path)
            db.add(TransactionAttachment(
                transaction_id=tx.id,
                original_name=f.filename or "unknown",
                stored_name=stored_name,
                file_path=file_path,
                mime_type=f.content_type or "application/octet-stream",
                file_size=len(content),
            ))
        db.commit()
    except Exception:
        db.rollback()
        for p in saved_paths:
            try:
                os.remove(p)
            except OSError:
                pass
        raise

    db.refresh(tx)
    return tx
