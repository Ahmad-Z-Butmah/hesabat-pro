from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.transaction import TransactionStatus, TransactionType


class TransactionAttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_name: str
    mime_type: str
    file_size: int
    file_path: str
    created_at: datetime


class TransactionBase(BaseModel):
    type: TransactionType
    status: TransactionStatus = TransactionStatus.pending
    amount: Decimal
    transaction_date: date

    method: str | None = None  # cash | transfer (لحركات الكاش فقط)

    check_no: str | None = None
    bank: str | None = None
    branch: str | None = None
    due_date: date | None = None

    note: str | None = None
    has_attachment: bool = False
    source_transaction_id: int | None = None


class TransactionCreate(TransactionBase):
    project_id: int
    party_id: int | None = None
    source_transaction_id: int | None = None


class TransactionUpdate(BaseModel):
    status: TransactionStatus | None = None
    amount: Decimal | None = None
    transaction_date: date | None = None
    check_no: str | None = None
    bank: str | None = None
    branch: str | None = None
    due_date: date | None = None
    note: str | None = None
    has_attachment: bool | None = None


class TransactionRead(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sequence_number: int
    project_id: int
    party_id: int | None = None
    party_name: str | None = None
    created_at: datetime
    attachments: list[TransactionAttachmentRead] = []


class BatchChequeIn(BaseModel):
    client_key: str | None = None
    amount: str
    check_no: str | None = None
    bank: str | None = None
    branch: str | None = None
    due_date: str | None = None
    source_transaction_id: int | None = None


class BatchTransactionsIn(BaseModel):
    type: TransactionType
    party_id: int | None = None
    party_name: str | None = None
    party_phone: str | None = None
    transaction_date: str
    note: str | None = None
    status: TransactionStatus | None = None
    cheques: list[BatchChequeIn]


class ProjectOverviewSummary(BaseModel):
    received_checks_total: Decimal = Decimal('0.00')
    received_checks_count: int = 0
    issued_checks_total: Decimal = Decimal('0.00')
    issued_checks_count: int = 0
    cash_received_total: Decimal = Decimal('0.00')
    cash_received_count: int = 0
    cash_paid_total: Decimal = Decimal('0.00')
    cash_paid_count: int = 0


class ProjectOverview(BaseModel):
    summary: ProjectOverviewSummary
    latest_transactions: list[TransactionRead]


class FinanceSummary(BaseModel):
    available_cash: Decimal = Decimal('0.00')
    pending_checks: Decimal = Decimal('0.00')
    pending_count: int = 0
    total_holdings: Decimal = Decimal('0.00')
    month_check_value: Decimal = Decimal('0.00')
    month_check_count: int = 0
    total_received: Decimal = Decimal('0.00')
    total_paid: Decimal = Decimal('0.00')
    paid_by_check: Decimal = Decimal('0.00')
    paid_by_cash: Decimal = Decimal('0.00')
    total_paid_to_people: Decimal = Decimal('0.00')
    transaction_count: int = 0
