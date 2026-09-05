from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class UnitSale(Base):
    """صفقة بيع وحدة عقارية واحدة: مصدر الحقيقة لعملية البيع وربطها بالوحدة والمشتري والحركات المالية."""

    __tablename__ = "unit_sales"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True, nullable=False)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id"), unique=True, nullable=False)
    buyer_party_id: Mapped[int] = mapped_column(ForeignKey("parties.id"), nullable=False)

    sale_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    down_payment: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    sale_date: Mapped[date] = mapped_column(Date, nullable=False)
    cheque_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("sale_price > 0", name="ck_unit_sales_price_positive"),
        CheckConstraint("down_payment >= 0", name="ck_unit_sales_down_payment_non_negative"),
        CheckConstraint("down_payment <= sale_price", name="ck_unit_sales_down_payment_le_price"),
        CheckConstraint("cheque_count >= 0", name="ck_unit_sales_cheque_count_non_negative"),
    )

    project: Mapped["Project"] = relationship(back_populates="unit_sales")
    unit: Mapped["Unit"] = relationship(back_populates="sale")
    buyer: Mapped["Party"] = relationship(back_populates="unit_sales")
    attachments: Mapped[list["SaleAttachment"]] = relationship(
        back_populates="sale", cascade="all, delete-orphan"
    )
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="sale")
