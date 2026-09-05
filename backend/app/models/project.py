from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=True)
    type: Mapped[str] = mapped_column(String(100), nullable=True)  # مطعم / عقارات / محل تجاري / مقهى ...
    mono: Mapped[str] = mapped_column(String(10), nullable=True)  # حرفان مختصران للأيقونة
    gradient_start: Mapped[str] = mapped_column(String(20), nullable=True)
    gradient_end: Mapped[str] = mapped_column(String(20), nullable=True)

    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    units: Mapped[list["Unit"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    parking_spots: Mapped[list["ParkingSpot"]] = relationship(back_populates="project")
    parties: Mapped[list["Party"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    unit_sales: Mapped[list["UnitSale"]] = relationship(back_populates="project")
