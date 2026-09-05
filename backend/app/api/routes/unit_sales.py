import os
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.routes.units import _assign_parking_on_sale, compute_assigned_parking_no
from app.db.session import get_db
from app.models.party import Party, PartyDirection
from app.models.project import Project
from app.models.sale_attachment import SaleAttachment
from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.models.transaction_attachment import TransactionAttachment
from app.models.unit import Unit, UnitStatus
from app.models.unit_sale import UnitSale
from app.models.user import User
from app.schemas.unit_sale import UnitSaleCreate, UnitSaleRead

router = APIRouter(prefix="/projects/{project_id}/unit-sales", tags=["بيع الوحدات"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "uploads", "sales")
ALLOWED_MIME = {"image/jpeg", "image/png", "application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024


def _ensure_upload_dir():
    os.makedirs(UPLOAD_DIR, exist_ok=True)


def _get_owned_project(db: Session, project_id: int, user: User) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    if project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="غير مخوّل للوصول إلى هذا المشروع")
    return project


def _store_upload(content: bytes, original_name: str, saved_paths: list[str]) -> tuple[str, str]:
    ext = os.path.splitext(original_name)[1] or ""
    stored_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, stored_name)
    with open(file_path, "wb") as out:
        out.write(content)
    saved_paths.append(file_path)
    return stored_name, file_path


@router.post("", response_model=UnitSaleRead, status_code=201)
async def create_unit_sale(
    project_id: int,
    payload: str = Form(...),
    files: list[UploadFile] = Form(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_project(db, project_id, current_user)
    data = UnitSaleCreate.model_validate_json(payload)

    unit = db.get(Unit, data.unit_id)
    if not unit or unit.project_id != project_id:
        raise HTTPException(status_code=404, detail="الوحدة غير موجودة في هذا المشروع")
    if unit.status == UnitStatus.sold:
        raise HTTPException(status_code=409, detail="هذه الوحدة مباعة بالفعل ولا يمكن بيعها مرة أخرى.")
    existing_sale = db.query(UnitSale).filter(UnitSale.unit_id == unit.id).first()
    if existing_sale:
        raise HTTPException(status_code=409, detail="يوجد بيع مسجل لهذه الوحدة بالفعل.")

    if data.down_payment > data.sale_price:
        raise HTTPException(status_code=400, detail="الدفعة الأولى لا يمكن أن تتجاوز سعر البيع.")

    cheques_total = sum((c.amount for c in data.cheques), Decimal("0.00"))
    if data.down_payment + cheques_total > data.sale_price:
        raise HTTPException(status_code=400, detail="مجموع الدفعة الأولى والشيكات يتجاوز سعر البيع.")

    cheque_keys = [c.client_key for c in data.cheques]
    if len(cheque_keys) != len(set(cheque_keys)):
        raise HTTPException(status_code=400, detail="لا يمكن تكرار نفس مفتاح الشيك في الطلب.")

    for f in files:
        if f.content_type not in ALLOWED_MIME:
            raise HTTPException(status_code=400, detail=f"نوع الملف غير مسموح: {f.filename}")

    file_by_key = {}
    for f in files:
        filename = f.filename or ""
        key = filename.split("::", 1)[0] if "::" in filename else ""
        file_by_key[key] = f

    contract_file = file_by_key.get("contract")
    if not contract_file:
        raise HTTPException(status_code=400, detail="يجب رفع ملف عقد البيع.")

    buyer = None
    if data.buyer_party_id is not None:
        buyer = db.get(Party, data.buyer_party_id)
        if not buyer or buyer.project_id != project_id:
            raise HTTPException(status_code=400, detail="الطرف المحدد غير صالح لهذا المشروع.")
    elif data.buyer_name:
        normalized_name = " ".join(data.buyer_name.strip().split())
        if not normalized_name:
            raise HTTPException(status_code=400, detail="اسم المشتري لا يمكن أن يكون فارغاً.")
        buyer = (
            db.query(Party)
            .filter(Party.project_id == project_id, Party.name == normalized_name)
            .first()
        )
        if not buyer:
            buyer = Party(
                project_id=project_id,
                name=normalized_name,
                direction=PartyDirection.in_,
                phone=data.buyer_phone or None,
            )
            db.add(buyer)
            db.flush()
    else:
        raise HTTPException(status_code=400, detail="يجب اختيار مشتري موجود أو إدخال اسم مشتري جديد.")

    sale = UnitSale(
        project_id=project_id,
        unit_id=unit.id,
        buyer_party_id=buyer.id,
        sale_price=data.sale_price,
        down_payment=data.down_payment,
        sale_date=data.sale_date,
        cheque_count=len(data.cheques),
        notes=data.notes,
    )
    db.add(sale)
    db.flush()

    saved_paths: list[str] = []
    try:
        _ensure_upload_dir()

        contract_content = await contract_file.read()
        if len(contract_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"حجم ملف العقد يتجاوز 10MB: {contract_file.filename}",
            )
        stored_name, file_path = _store_upload(
            contract_content, contract_file.filename or "contract", saved_paths
        )
        db.add(SaleAttachment(
            sale_id=sale.id,
            original_name=contract_file.filename or "unknown",
            stored_name=stored_name,
            file_path=file_path,
            mime_type=contract_file.content_type or "application/octet-stream",
            file_size=len(contract_content),
        ))

        if data.down_payment > 0:
            db.add(Transaction(
                project_id=project_id,
                party_id=buyer.id,
                sale_id=sale.id,
                type=TransactionType.cash_in,
                method="cash",
                status=TransactionStatus.cleared,
                amount=data.down_payment,
                transaction_date=data.sale_date,
                note=f"دفعة أولى لبيع {unit.no}",
                has_attachment=False,
            ))
            db.flush()

        for c in data.cheques:
            tx = Transaction(
                project_id=project_id,
                party_id=buyer.id,
                sale_id=sale.id,
                type=TransactionType.check_in,
                status=TransactionStatus.pending,
                amount=c.amount,
                transaction_date=data.sale_date,
                check_no=c.check_no,
                bank=c.bank,
                branch=c.branch,
                due_date=c.due_date,
                note=f"شيك من خطة دفع بيع {unit.no}",
                has_attachment=False,
            )
            db.add(tx)
            db.flush()

            upload = file_by_key.get(c.client_key)
            if upload:
                content = await upload.read()
                if len(content) > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=400,
                        detail=f"حجم صورة الشيك يتجاوز 10MB: {upload.filename}",
                    )
                original_name = upload.filename.split("::", 1)[1] if "::" in (upload.filename or "") else (upload.filename or "unknown")
                stored_name, file_path = _store_upload(content, original_name, saved_paths)
                db.add(TransactionAttachment(
                    transaction_id=tx.id,
                    original_name=original_name,
                    stored_name=stored_name,
                    file_path=file_path,
                    mime_type=upload.content_type or "application/octet-stream",
                    file_size=len(content),
                ))
                tx.has_attachment = True

        _assign_parking_on_sale(db, unit)

        unit.status = UnitStatus.sold
        unit.buyer_name = buyer.name

        db.commit()
    except Exception:
        db.rollback()
        for p in saved_paths:
            try:
                os.remove(p)
            except OSError:
                pass
        raise

    project_units = db.query(Unit).filter(Unit.project_id == project_id).all()
    assigned_no = compute_assigned_parking_no(project_units, unit)
    db.refresh(sale)
    return UnitSaleRead(
        id=sale.id,
        project_id=project_id,
        unit_id=unit.id,
        buyer_party_id=buyer.id,
        sale_price=sale.sale_price,
        down_payment=sale.down_payment,
        sale_date=sale.sale_date,
        cheque_count=sale.cheque_count,
        notes=sale.notes,
        created_at=sale.created_at,
        buyer_name=buyer.name,
        assigned_parking_no=assigned_no,
    )
