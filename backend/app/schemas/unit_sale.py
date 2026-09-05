from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class SaleChequeIn(BaseModel):
    client_key: str
    amount: Decimal = Field(..., gt=0)
    check_no: str | None = None
    bank: str | None = None
    branch: str | None = None
    due_date: date | None = None


class UnitSaleCreate(BaseModel):
    unit_id: int
    buyer_party_id: int | None = None
    buyer_name: str | None = None
    buyer_phone: str | None = None
    sale_price: Decimal = Field(..., gt=0)
    down_payment: Decimal = Field(Decimal("0.00"), ge=0)
    sale_date: date
    notes: str | None = None
    cheques: list[SaleChequeIn] = []


class UnitSaleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    unit_id: int
    buyer_party_id: int
    sale_price: Decimal
    down_payment: Decimal
    sale_date: date
    cheque_count: int
    notes: str | None = None
    created_at: datetime

    buyer_name: str | None = None
    assigned_parking_no: int | None = None
