import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class UnitStatus(str, enum.Enum):
    available = "available"
    reserved = "reserved"
    sold = "sold"


class UnitType(str, enum.Enum):
    apartment = "apartment"
    roof = "roof"
    storage = "storage"
    studio = "studio"


class Unit(Base):
    """شقة أو وحدة تابعة لمشروع عقاري."""

    __tablename__ = "units"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)

    no: Mapped[str] = mapped_column(String(20), nullable=False)  # رقم الشقة، مثال "101"
    floor: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[UnitStatus] = mapped_column(Enum(UnitStatus), default=UnitStatus.available)
    buyer_name: Mapped[str] = mapped_column(String(255), nullable=True)
    unit_type: Mapped[UnitType | None] = mapped_column(Enum(UnitType), nullable=True)
    area: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="units")
    parking_spots: Mapped[list["ParkingSpot"]] = relationship(back_populates="unit")
    sale: Mapped["UnitSale | None"] = relationship(back_populates="unit")
