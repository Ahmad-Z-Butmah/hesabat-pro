import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class TransactionType(str, enum.Enum):
    check_in = "check_in"  # شيك مستلم
    check_out = "check_out"  # شيك صادر
    cash_in = "cash_in"  # كاش مستلم
    cash_out = "cash_out"  # كاش صادر


class TransactionStatus(str, enum.Enum):
    pending = "pending"  # مستحق / قيد التحصيل
    cleared = "cleared"  # تم الصرف / مقبوض / مدفوع
    bounced = "bounced"  # مرتجع


class Transaction(Base):
    """حركة مالية واحدة: شيك أو كاش، وارد أو صادر."""

    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    sequence_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        unique=True,
        server_default=text("nextval('transactions_sequence_number_seq')"),
    )
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    party_id: Mapped[int] = mapped_column(ForeignKey("parties.id"), nullable=True)

    type: Mapped[TransactionType] = mapped_column(Enum(TransactionType), nullable=False)
    method: Mapped[str | None] = mapped_column(String(20), nullable=True)  # cash | transfer (لحركات الكاش فقط)
    status: Mapped[TransactionStatus] = mapped_column(Enum(TransactionStatus), default=TransactionStatus.pending)

    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)  # تاريخ الاستلام/الصرف الفعلي

    # حقول خاصة بالشيكات فقط (تبقى فارغة في حركات الكاش)
    check_no: Mapped[str] = mapped_column(String(50), nullable=True)
    bank: Mapped[str] = mapped_column(String(150), nullable=True)
    branch: Mapped[str] = mapped_column(String(150), nullable=True)
    due_date: Mapped[date] = mapped_column(Date, nullable=True)  # تاريخ استحقاق الشيك

    source_transaction_id: Mapped[int | None] = mapped_column(ForeignKey("transactions.id"), nullable=True)
    sale_id: Mapped[int | None] = mapped_column(ForeignKey("unit_sales.id"), nullable=True, index=True)

    note: Mapped[str] = mapped_column(Text, nullable=True)
    has_attachment: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="transactions")
    party: Mapped["Party"] = relationship(back_populates="transactions")
    sale: Mapped["UnitSale | None"] = relationship(back_populates="transactions")
    attachments: Mapped[list["TransactionAttachment"]] = relationship(
        back_populates="transaction", cascade="all, delete-orphan"
    )

    @property
    def party_name(self) -> str | None:
        return self.party.name if self.party else None
