from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class CustomerUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None


class CustomerUnitSummary(BaseModel):
    """وحدة اشتراها العميل — مشتقة من UnitSale الحقيقي في المشروع."""

    unit_id: int
    unit_no: str
    unit_type: str | None = None


class CustomerSummary(BaseModel):
    """عميل = مشتري وحدة حقيقي (Party مرتبط ببيع داخل المشروع).

    كل الحقول مشتقة من العلاقات الفعلية:
    Project → Unit → UnitSale → Buyer(Party) → Payments/Checks(Transaction).
    """

    id: int  # معرّف المشتري (Party id)
    project_id: int
    name: str
    phone: str | None = None

    units: list[CustomerUnitSummary] = []
    unit_nos: list[str] = []

    sale_price_total: Decimal = Decimal("0.00")
    paid_total: Decimal = Decimal("0.00")
    remaining_total: Decimal = Decimal("0.00")

    check_count: int = 0
    pending_check_count: int = 0
    pending_check_total: Decimal = Decimal("0.00")

    cash_received: Decimal = Decimal("0.00")
    transfer_received: Decimal = Decimal("0.00")
    check_received: Decimal = Decimal("0.00")
    received_total: Decimal = Decimal("0.00")

    nearest_due_date: date | None = None
    last_transaction_date: date | None = None
    is_overdue: bool = False
    transaction_count: int = 0


class CustomerUnitRead(CustomerUnitSummary):
    sale_price: Decimal = Decimal("0.00")
    down_payment: Decimal = Decimal("0.00")
    sale_date: date | None = None
    cheque_count: int = 0


class CustomerRead(BaseModel):
    """تفاصيل عميل (مشتري وحدة) مع كل وحداته وخطة الدفع وملخص مالي."""

    id: int
    project_id: int
    name: str
    phone: str | None = None

    units: list[CustomerUnitRead] = []

    sale_price_total: Decimal = Decimal("0.00")
    paid_total: Decimal = Decimal("0.00")
    remaining_total: Decimal = Decimal("0.00")

    check_count: int = 0
    pending_check_count: int = 0
    pending_check_total: Decimal = Decimal("0.00")

    cash_received: Decimal = Decimal("0.00")
    transfer_received: Decimal = Decimal("0.00")
    check_received: Decimal = Decimal("0.00")
    received_total: Decimal = Decimal("0.00")

    nearest_due_date: date | None = None
    last_transaction_date: date | None = None
    is_overdue: bool = False
    transaction_count: int = 0
