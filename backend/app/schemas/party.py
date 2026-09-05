from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.party import PartyDirection


class PartyBase(BaseModel):
    name: str
    role: str | None = None
    direction: PartyDirection
    phone: str | None = None


class PartyCreate(PartyBase):
    project_id: int


class PartyUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    direction: PartyDirection | None = None
    phone: str | None = None


class PartyRead(PartyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    created_at: datetime


class PartySummary(BaseModel):
    """ملخص حسابات طرف واحد مشتق من حركاته الحقيقية في قاعدة البيانات."""

    id: int
    project_id: int
    name: str
    role: str | None = None
    direction: PartyDirection
    phone: str | None = None

    transaction_count: int = 0

    cash_received: Decimal = Decimal("0.00")
    cash_paid: Decimal = Decimal("0.00")
    check_received: Decimal = Decimal("0.00")
    check_paid: Decimal = Decimal("0.00")

    received_total: Decimal = Decimal("0.00")
    paid_total: Decimal = Decimal("0.00")
    total_activity: Decimal = Decimal("0.00")
    net_balance: Decimal = Decimal("0.00")

    last_transaction_date: date | None = None
