import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class PartyDirection(str, enum.Enum):
    in_ = "in"  # عميل/مستأجر — نقبض منه
    out = "out"  # مقاول/مورد — ندفع له


class Party(Base):
    """طرف نتعامل معه مالياً: عميل، مقاول، مورد ..."""

    __tablename__ = "parties"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(255), nullable=True)  # مثال: "عميل — شقة 101"
    direction: Mapped[PartyDirection] = mapped_column(Enum(PartyDirection), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="parties")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="party", cascade="all, delete-orphan")
    unit_sales: Mapped[list["UnitSale"]] = relationship(back_populates="buyer")
