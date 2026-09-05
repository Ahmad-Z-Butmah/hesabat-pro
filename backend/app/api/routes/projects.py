import os
import uuid
from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.project import Project
from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.models.transaction_attachment import TransactionAttachment
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.schemas.reports import (
    ProjectReports,
    ReportsCashedCheque,
    ReportsCashedCheques,
    ReportsChartBar,
    ReportsDuePayment,
    ReportsInsight,
    ReportsMethod,
    ReportsPositionMetric,
    ReportsPropertyPerformance,
    ReportsQuarter,
    ReportsRow,
    ReportsSummaryCard,
    ReportsTrackerRow,
    ReportsWeekTracker,
    ReportsYearlyProfit,
)
from app.schemas.transaction import (
    BatchChequeIn,
    BatchTransactionsIn,
    FinanceSummary,
    ProjectOverview,
    ProjectOverviewSummary,
    TransactionRead,
)
from app.models.party import Party, PartyDirection

AR_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
AR_MONTHS = ["ينا", "فبر", "مار", "أبر", "ماي", "يون", "يول", "أغس", "سبت", "أكت", "نوف", "ديس"]
QUARTER_LABELS = ["الربع الأول", "الربع الثاني", "الربع الثالث", "الربع الرابع"]

router = APIRouter(prefix="/projects", tags=["المشاريع"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "uploads", "transactions")
ALLOWED_MIME = {"image/jpeg", "image/png", "application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024


def _ensure_upload_dir():
    os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("", response_model=list[ProjectRead])
def list_projects(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Project).order_by(Project.created_at.desc()).all()


@router.post("", response_model=ProjectRead, status_code=201)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = Project(**project_in.model_dump(), owner_id=current_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    return project


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    for field, value in project_in.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="غير مخوّل لحذف هذا المشروع")
    db.delete(project)
    db.commit()


@router.post("/{project_id}/transactions", response_model=TransactionRead, status_code=201)
async def create_project_transaction(
    project_id: int,
    party_id: int = Form(None),
    party_name: str = Form(None),
    party_phone: str = Form(None),
    type: str = Form(...),
    amount: str = Form(...),
    transaction_date: str = Form(...),
    note: str = Form(None),
    status: str = Form("cleared"),
    check_no: str = Form(None),
    bank: str = Form(None),
    branch: str = Form(None),
    due_date: str = Form(None),
    source_transaction_id: str = Form(None),
    files: list[UploadFile] = Form(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="غير مخوّل لإضافة حركة لهذا المشروع")

    if not party_id and not party_name:
        raise HTTPException(status_code=400, detail="يجب إدخال party_id أو party_name")

    if party_id is not None:
        party = db.get(Party, party_id)
        if not party or party.project_id != project_id:
            raise HTTPException(status_code=400, detail="الطرف غير صالح لهذا المشروع")
    else:
        normalized_name = " ".join(party_name.strip().split())
        party = db.query(Party).filter(
            Party.project_id == project_id,
            Party.name == normalized_name,
        ).first()
        if not party:
            direction = PartyDirection.in_ if type in ("cash_in", "check_in") else PartyDirection.out
            party = Party(
                project_id=project_id,
                name=normalized_name,
                direction=direction,
                phone=party_phone if party_phone else None,
            )
            db.add(party)
            db.flush()

    try:
        txn_type = TransactionType(type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"نوع الحركة غير صالح: {type}")

    try:
        txn_status = TransactionStatus(status)
    except ValueError:
        txn_status = TransactionStatus.cleared

    parsed_amount = Decimal(str(amount))
    parsed_date = date.fromisoformat(transaction_date)

    parsed_due_date = None
    if due_date:
        parsed_due_date = date.fromisoformat(due_date)

    parsed_source_id = int(source_transaction_id) if source_transaction_id else None

    for f in files:
        if f.content_type not in ALLOWED_MIME:
            raise HTTPException(
                status_code=400,
                detail=f"نوع الملف غير مسموح: {f.filename} ({f.content_type})"
            )

    is_cash_in = txn_type == TransactionType.cash_in
    tx = Transaction(
        project_id=project_id,
        party_id=party.id,
        type=txn_type,
        status=txn_status,
        amount=parsed_amount,
        transaction_date=parsed_date,
        check_no=check_no if not is_cash_in else None,
        bank=bank if not is_cash_in else None,
        branch=branch if not is_cash_in else None,
        due_date=parsed_due_date if not is_cash_in else None,
        source_transaction_id=parsed_source_id,
        note=note,
        has_attachment=len(files) > 0,
    )
    db.add(tx)
    db.flush()

    if parsed_source_id and txn_type == TransactionType.check_out:
        source_tx = db.get(Transaction, parsed_source_id)
        if source_tx and source_tx.status == TransactionStatus.pending:
            source_tx.status = TransactionStatus.cleared

    saved_paths = []
    try:
        _ensure_upload_dir()
        for f in files:
            content = await f.read()
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"الملف كبير جداً: {f.filename} (الحد الأقصى 10MB)"
                )

            ext = os.path.splitext(f.filename or "file")[1] or ""
            stored_name = f"{uuid.uuid4().hex}{ext}"
            file_path = os.path.join(UPLOAD_DIR, stored_name)

            with open(file_path, "wb") as out:
                out.write(content)

            saved_paths.append(file_path)

            attachment = TransactionAttachment(
                transaction_id=tx.id,
                original_name=f.filename or "unknown",
                stored_name=stored_name,
                file_path=file_path,
                mime_type=f.content_type or "application/octet-stream",
                file_size=len(content),
            )
            db.add(attachment)

        db.commit()
        db.refresh(tx)
    except Exception:
        db.rollback()
        for p in saved_paths:
            try:
                os.remove(p)
            except OSError:
                pass
        raise

    return tx


@router.post("/{project_id}/transactions/batch", response_model=list[TransactionRead], status_code=201)
async def create_project_transactions_batch(
    project_id: int,
    payload: str = Form(...),
    files: list[UploadFile] = Form(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payload = BatchTransactionsIn.model_validate_json(payload)

    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="غير مخوّل لإضافة حركات لهذا المشروع")

    if not payload.cheques:
        raise HTTPException(status_code=400, detail="يجب إدخال شيك واحد على الأقل")

    party = None
    if payload.party_id is not None:
        party = db.get(Party, payload.party_id)
        if not party or party.project_id != project_id:
            raise HTTPException(status_code=400, detail="الطرف غير صالح لهذا المشروع")
    elif payload.party_name:
        normalized_name = " ".join(payload.party_name.strip().split())
        party = db.query(Party).filter(
            Party.project_id == project_id,
            Party.name == normalized_name,
        ).first()
        if not party:
            direction = (
                PartyDirection.in_
                if payload.type in (TransactionType.cash_in, TransactionType.check_in)
                else PartyDirection.out
            )
            party = Party(
                project_id=project_id,
                name=normalized_name,
                direction=direction,
                phone=payload.party_phone or None,
            )
            db.add(party)
            db.flush()
    else:
        raise HTTPException(status_code=400, detail="يجب إدخال party_id أو party_name")

    source_ids = [c.source_transaction_id for c in payload.cheques if c.source_transaction_id]
    if len(source_ids) != len(set(source_ids)):
        raise HTTPException(status_code=400, detail="لا يمكن استخدام نفس الشيك المصدر أكثر من مرة")

    for f in files:
        if f.content_type not in ALLOWED_MIME:
            raise HTTPException(
                status_code=400,
                detail=f"نوع الملف غير مسموح: {f.filename} ({f.content_type})"
            )

    file_by_key = {}
    for f in files:
        filename = f.filename or ""
        key = filename.split("::", 1)[0] if "::" in filename else ""
        file_by_key[key] = f

    txn_status = TransactionStatus.pending if payload.type == TransactionType.check_in else (payload.status or TransactionStatus.cleared)
    parsed_date = date.fromisoformat(payload.transaction_date)

    txs = []
    saved_paths = []
    try:
        _ensure_upload_dir()
        for c in payload.cheques:
            parsed_amount = Decimal(str(c.amount))
            parsed_due = date.fromisoformat(c.due_date) if c.due_date else None
            tx = Transaction(
                project_id=project_id,
                party_id=party.id,
                type=payload.type,
                status=txn_status,
                amount=parsed_amount,
                transaction_date=parsed_date,
                check_no=c.check_no,
                bank=c.bank,
                branch=c.branch,
                due_date=parsed_due,
                source_transaction_id=c.source_transaction_id,
                note=payload.note,
            )
            db.add(tx)
            db.flush()

            if c.source_transaction_id and payload.type == TransactionType.check_out:
                source_tx = db.get(Transaction, c.source_transaction_id)
                if source_tx and source_tx.status == TransactionStatus.pending:
                    source_tx.status = TransactionStatus.cleared

            upload = file_by_key.get(c.client_key or "")
            if upload:
                content = await upload.read()
                if len(content) > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=400,
                        detail=f"حجم الملف يتجاوز 10MB: {upload.filename}"
                    )

                filename = upload.filename or ""
                original_name = filename.split("::", 1)[1] if "::" in filename else (filename or "unknown")
                ext = os.path.splitext(original_name)[1] or ""
                stored_name = f"{uuid.uuid4().hex}{ext}"
                file_path = os.path.join(UPLOAD_DIR, stored_name)

                with open(file_path, "wb") as out:
                    out.write(content)
                saved_paths.append(file_path)

                attachment = TransactionAttachment(
                    transaction_id=tx.id,
                    original_name=original_name,
                    stored_name=stored_name,
                    file_path=file_path,
                    mime_type=upload.content_type or "application/octet-stream",
                    file_size=len(content),
                )
                db.add(attachment)
                tx.has_attachment = True

            txs.append(tx)

        db.commit()
    except Exception:
        db.rollback()
        for p in saved_paths:
            try:
                os.remove(p)
            except OSError:
                pass
        raise

    for tx in txs:
        db.refresh(tx)
    return txs


@router.get("/{project_id}/transactions", response_model=list[TransactionRead])
def list_project_transactions(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="غير مخوّل")
    return (
        db.query(Transaction)
        .filter(Transaction.project_id == project_id)
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc(), Transaction.id.desc())
        .all()
    )


@router.get("/{project_id}/finance/summary", response_model=FinanceSummary)
def get_finance_summary(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="غير مخوّل")

    txs = db.query(Transaction).filter(Transaction.project_id == project_id).all()

    cash_in_total = sum(t.amount for t in txs if t.type == TransactionType.cash_in)
    cash_out_total = sum(t.amount for t in txs if t.type == TransactionType.cash_out)

    check_in_cleared = sum(
        t.amount for t in txs if t.type == TransactionType.check_in and t.status == TransactionStatus.cleared
    )
    check_out_cleared = sum(
        t.amount for t in txs if t.type == TransactionType.check_out and t.status == TransactionStatus.cleared
    )

    pending_check_ins = [t for t in txs if t.type == TransactionType.check_in and t.status == TransactionStatus.pending]
    pending_sum = sum(t.amount for t in pending_check_ins)
    pending_count = len(pending_check_ins)

    available_cash = cash_in_total - cash_out_total + check_in_cleared - check_out_cleared
    total_holdings = available_cash + pending_sum

    today = date.today()
    current_month_start = today.replace(day=1)
    if today.month == 12:
        next_month = today.replace(year=today.year + 1, month=1)
    else:
        next_month = today.replace(month=today.month + 1)

    month_checks = [
        t
        for t in txs
        if t.due_date
        and current_month_start <= t.due_date < next_month
        and t.type in (TransactionType.check_in, TransactionType.check_out)
    ]
    month_check_value = sum(t.amount for t in month_checks)
    month_check_count = len(month_checks)

    check_in_total = sum(t.amount for t in txs if t.type == TransactionType.check_in)
    check_out_total = sum(t.amount for t in txs if t.type == TransactionType.check_out)

    total_received = cash_in_total + check_in_total
    total_paid = cash_out_total + check_out_total

    paid_by_check = check_out_cleared
    paid_by_cash = cash_out_total
    total_paid_to_people = paid_by_cash + paid_by_check

    return FinanceSummary(
        available_cash=available_cash,
        pending_checks=pending_sum,
        pending_count=pending_count,
        total_holdings=total_holdings,
        month_check_value=month_check_value,
        month_check_count=month_check_count,
        total_received=total_received,
        total_paid=total_paid,
        paid_by_check=paid_by_check,
        paid_by_cash=paid_by_cash,
        total_paid_to_people=total_paid_to_people,
        transaction_count=len(txs),
    )


@router.get("/{project_id}/overview", response_model=ProjectOverview)
def get_project_overview(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="غير مخوّل")

    rows = (
        db.query(Transaction.type, func.sum(Transaction.amount), func.count(Transaction.id))
        .filter(Transaction.project_id == project_id)
        .group_by(Transaction.type)
        .all()
    )

    agg = {row[0]: (row[1], row[2]) for row in rows}

    def _totals(tx_type: TransactionType) -> tuple[Decimal, int]:
        total, count = agg.get(tx_type, (None, 0))
        return (Decimal(total) if total is not None else Decimal("0.00")), count

    received_checks_total, received_checks_count = _totals(TransactionType.check_in)
    issued_checks_total, issued_checks_count = _totals(TransactionType.check_out)
    cash_received_total, cash_received_count = _totals(TransactionType.cash_in)
    cash_paid_total, cash_paid_count = _totals(TransactionType.cash_out)

    latest_transactions = (
        db.query(Transaction)
        .filter(Transaction.project_id == project_id)
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc(), Transaction.id.desc())
        .limit(10)
        .all()
    )

    return ProjectOverview(
        summary=ProjectOverviewSummary(
            received_checks_total=received_checks_total,
            received_checks_count=received_checks_count,
            issued_checks_total=issued_checks_total,
            issued_checks_count=issued_checks_count,
            cash_received_total=cash_received_total,
            cash_received_count=cash_received_count,
            cash_paid_total=cash_paid_total,
            cash_paid_count=cash_paid_count,
        ),
        latest_transactions=latest_transactions,
    )


def _status_ar(tx: Transaction) -> str:
    if tx.status == TransactionStatus.cleared:
        return "محصل" if tx.type in (TransactionType.check_in, TransactionType.cash_in) else "مدفوع"
    if tx.status == TransactionStatus.bounced:
        return "مرتجع"
    if tx.type == TransactionType.check_in:
        return "متأخر" if tx.due_date and tx.due_date < date.today() else "غير محصل"
    return "مستحق قريباً"


def _report_row(tx: Transaction) -> ReportsRow:
    return ReportsRow(
        id=tx.id,
        type=tx.type.value,
        dir="in" if tx.type in (TransactionType.check_in, TransactionType.cash_in) else "out",
        method="شيك" if tx.type in (TransactionType.check_in, TransactionType.check_out) else "كاش",
        no=tx.check_no,
        unit="—",
        party=tx.party.name if tx.party else None,
        cat="—",
        g=tx.transaction_date,
        amount=tx.amount,
        status=_status_ar(tx),
        statusRaw=tx.status.value,
    )


@router.get("/{project_id}/reports", response_model=ProjectReports)
def get_project_reports(
    project_id: int,
    period: str = Query(default="monthly"),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="غير مخوّل")

    if period not in ("weekly", "monthly", "yearly"):
        period = "monthly"

    today = date.today()

    if date_from and date_to:
        win_start, win_end = date_from, date_to
    elif period == "weekly":
        win_start = today - timedelta(days=(today.weekday() + 1) % 7)
        win_end = win_start + timedelta(days=6)
    elif period == "yearly":
        win_start = today.replace(month=1, day=1)
        win_end = today.replace(month=12, day=31)
    else:
        win_start = today.replace(day=1)
        if today.month == 12:
            win_end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            win_end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)

    all_txs = (
        db.query(Transaction)
        .filter(Transaction.project_id == project_id)
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc(), Transaction.id.desc())
        .all()
    )
    period_txs = [t for t in all_txs if win_start <= t.transaction_date <= win_end]

    rows = [_report_row(t) for t in period_txs]
    total_count = len(period_txs)

    def _sum(iterable) -> Decimal:
        return sum((t.amount for t in iterable), Decimal("0.00"))

    cash_in = [t for t in period_txs if t.type == TransactionType.cash_in]
    cash_out = [t for t in period_txs if t.type == TransactionType.cash_out]
    check_in = [t for t in period_txs if t.type == TransactionType.check_in]
    check_out = [t for t in period_txs if t.type == TransactionType.check_out]

    in_txs = cash_in + check_in
    out_txs = cash_out + check_out

    summary = [
        ReportsSummaryCard(label="استلمت نقداً / تحويلاً", value=_sum(cash_in), count=len(cash_in)),
        ReportsSummaryCard(label="صرفت نقداً / تحويلاً", value=_sum(cash_out), count=len(cash_out)),
        ReportsSummaryCard(label="استلمت شيكات", value=_sum(check_in), count=len(check_in)),
        ReportsSummaryCard(label="صدرت شيكات", value=_sum(check_out), count=len(check_out)),
    ]

    methods_total = _sum(period_txs)
    cash_method = _sum(cash_in) + _sum(cash_out)
    check_method = _sum(check_in) + _sum(check_out)
    methods = [
        ReportsMethod(label="كاش", amount=cash_method, pct=round(cash_method * 100 / methods_total) if methods_total else 0),
        ReportsMethod(label="شيك", amount=check_method, pct=round(check_method * 100 / methods_total) if methods_total else 0),
    ]

    in_types = (TransactionType.cash_in, TransactionType.check_in)
    out_types = (TransactionType.cash_out, TransactionType.check_out)

    if period == "weekly":
        bars = [
            ReportsChartBar(
                label=AR_DAYS[i],
                income=_sum([t for t in period_txs if t.transaction_date.weekday() == (i + 6) % 7 and t.type in in_types]),
                expense=_sum([t for t in period_txs if t.transaction_date.weekday() == (i + 6) % 7 and t.type in out_types]),
            )
            for i in range(7)
        ]
    elif period == "monthly":
        weeks = sorted({(t.transaction_date.day + 6) // 7 for t in period_txs})
        bars = [
            ReportsChartBar(
                label=f"أسبوع {w}",
                income=_sum([t for t in period_txs if (t.transaction_date.day + 6) // 7 == w and t.type in in_types]),
                expense=_sum([t for t in period_txs if (t.transaction_date.day + 6) // 7 == w and t.type in out_types]),
            )
            for w in weeks
        ]
    else:
        bars = [
            ReportsChartBar(
                label=AR_MONTHS[m - 1],
                income=_sum([t for t in period_txs if t.transaction_date.month == m and t.type in in_types]),
                expense=_sum([t for t in period_txs if t.transaction_date.month == m and t.type in out_types]),
            )
            for m in range(1, 13)
        ]

    collected = [t for t in in_txs if t.status == TransactionStatus.cleared]
    paid = [t for t in out_txs if t.status == TransactionStatus.cleared]
    cash_rows = [t for t in period_txs if t.type in (TransactionType.cash_in, TransactionType.cash_out)]
    held = [t for t in period_txs if t.type == TransactionType.check_in and t.status == TransactionStatus.pending]
    owed = [t for t in period_txs if t.type == TransactionType.check_out and t.status == TransactionStatus.pending]

    cash_in_total_all = _sum([t for t in all_txs if t.type == TransactionType.cash_in])
    cash_out_total_all = _sum([t for t in all_txs if t.type == TransactionType.cash_out])
    check_in_cleared_all = _sum(
        [t for t in all_txs if t.type == TransactionType.check_in and t.status == TransactionStatus.cleared]
    )
    check_out_cleared_all = _sum(
        [t for t in all_txs if t.type == TransactionType.check_out and t.status == TransactionStatus.cleared]
    )
    available_cash = cash_in_total_all - cash_out_total_all + check_in_cleared_all - check_out_cleared_all

    position = [
        ReportsPositionMetric(
            id="in",
            label="قبضت (المحصَّل فعلاً)",
            desc="نقد وتحويلات وشيكات محصَّلة",
            value=_sum(collected),
            items=[_report_row(t) for t in collected],
        ),
        ReportsPositionMetric(
            id="out",
            label="دفعت (المصروف فعلاً)",
            desc="ما خرج فعلاً من الصندوق",
            value=_sum(paid),
            items=[_report_row(t) for t in paid],
        ),
        ReportsPositionMetric(
            id="cash",
            label="الكاش المتوفر فعلاً",
            desc="الرصيد المتاح نقداً وبنكياً الآن",
            value=available_cash,
            items=[_report_row(t) for t in cash_rows],
        ),
        ReportsPositionMetric(
            id="held",
            label="شيكات بحوزتك (لم تُصرف بعد)",
            desc="شيكات واردة بانتظار التحصيل",
            value=_sum(held),
            items=[_report_row(t) for t in held],
        ),
        ReportsPositionMetric(
            id="owed",
            label="شيكات صدرتها ولم تُصرف بعد",
            desc="الباقي المستحق عليك",
            value=_sum(owed),
            items=[_report_row(t) for t in owed],
        ),
    ]

    week_tracker = ReportsWeekTracker()
    if period == "weekly":
        week_checks = [t for t in period_txs if t.type in (TransactionType.check_in, TransactionType.check_out)]
        cashed_checks = [t for t in week_checks if t.status == TransactionStatus.cleared]
        pending_checks = [t for t in week_checks if t.status == TransactionStatus.pending]
        week_tracker = ReportsWeekTracker(
            rows=[
                ReportsTrackerRow(
                    no=t.check_no,
                    dir="in" if t.type == TransactionType.check_in else "out",
                    party=t.party.name if t.party else None,
                    unit="—",
                    amount=t.amount,
                    g=t.transaction_date,
                    status=_status_ar(t),
                )
                for t in week_checks
            ],
            cashed_count=len(cashed_checks),
            cashed_value=_sum(cashed_checks),
            pending_count=len(pending_checks),
            pending_value=_sum(pending_checks),
        )

    due_txs = [
        t
        for t in all_txs
        if t.type == TransactionType.check_out
        and t.status == TransactionStatus.pending
        and t.due_date
        and t.due_date >= today
    ]
    due_txs.sort(key=lambda t: t.due_date)
    due_payments = [
        ReportsDuePayment(
            party=t.party.name if t.party else None,
            unit="—",
            note=t.note or "",
            cat="—",
            method=f"شيك #{t.check_no}" if t.check_no else "شيك",
            amount=t.amount,
            day=AR_DAYS[(t.due_date.weekday() + 1) % 7],
            due_date=t.due_date,
            attach=t.has_attachment,
        )
        for t in due_txs
    ]

    cashed_cheques_rows = []
    if period in ("monthly", "yearly"):
        cashed_checks = [
            t
            for t in period_txs
            if t.type in (TransactionType.check_in, TransactionType.check_out)
            and t.status == TransactionStatus.cleared
        ]
        for t in cashed_checks:
            issued = t.created_at.date() if t.created_at else t.transaction_date
            cashed_cheques_rows.append(
                ReportsCashedCheque(
                    dir="in" if t.type == TransactionType.check_in else "out",
                    no=t.check_no,
                    party=t.party.name if t.party else None,
                    unit="—",
                    cat="—",
                    reason=t.note,
                    issued=issued,
                    cashed=t.transaction_date,
                    deferred=(issued.year, issued.month) != (t.transaction_date.year, t.transaction_date.month),
                    amount=t.amount,
                )
            )
    cashed_cheques = ReportsCashedCheques(
        rows=cashed_cheques_rows,
        count=len(cashed_cheques_rows),
        total=_sum(cashed_cheques_rows),
    )

    insights = []
    if period_txs:
        net = _sum(in_txs) - _sum(out_txs)
        if net >= 0:
            insights.append(ReportsInsight(icon="📈", tone="good", kind="net_positive", amount=net))
        else:
            insights.append(ReportsInsight(icon="📉", tone="bad", kind="net_negative", amount=net))
        top_out = max(out_txs, key=lambda t: t.amount) if out_txs else None
        top_in = max(in_txs, key=lambda t: t.amount) if in_txs else None
        if top_out:
            insights.append(
                ReportsInsight(
                    icon="📌",
                    tone="warn",
                    kind="top_out",
                    amount=top_out.amount,
                    party=top_out.party.name if top_out.party else None,
                )
            )
        if top_in:
            insights.append(
                ReportsInsight(
                    icon="✅",
                    tone="good",
                    kind="top_in",
                    amount=top_in.amount,
                    party=top_in.party.name if top_in.party else None,
                )
            )
    else:
        insights.append(ReportsInsight(icon="📭", tone="warn", kind="empty"))

    yearly_profit = None
    if period == "yearly":
        rev = _sum(in_txs)
        cost = _sum(out_txs)
        net = rev - cost
        quarters = []
        for qi in range(4):
            q_rows = [t for t in period_txs if t.transaction_date.month // 3 == qi]
            q_rev = _sum([t for t in q_rows if t.type in in_types])
            q_cost = _sum([t for t in q_rows if t.type in out_types])
            q_net = q_rev - q_cost
            quarters.append(
                ReportsQuarter(
                    label=QUARTER_LABELS[qi],
                    rev=q_rev,
                    cost=q_cost,
                    net=q_net,
                    pct=round(q_net * 100 / q_cost) if q_cost else 0,
                )
            )
        yearly_profit = ReportsYearlyProfit(
            cost=cost,
            rev=rev,
            net=net,
            pct=round(net * 100 / cost) if cost else 0,
            quarters=quarters,
        )

    return ProjectReports(
        total_count=total_count,
        summary=summary,
        methods=methods,
        methods_total=methods_total,
        insights=insights,
        bars=bars,
        position=position,
        week_tracker=week_tracker,
        due_payments=due_payments,
        due_total=_sum(due_txs),
        due_count=len(due_txs),
        cashed_cheques=cashed_cheques,
        property_performance=ReportsPropertyPerformance(),
        yearly_profit=yearly_profit,
        rows=rows,
    )
