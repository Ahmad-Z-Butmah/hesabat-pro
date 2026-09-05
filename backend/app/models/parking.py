from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class ParkingSpot(Base):
    """موقف سيارات، قد يكون تابعاً لشقة أو موقف زوار."""

    __tablename__ = "parking_spots"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True, nullable=False)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id"), nullable=True)

    code: Mapped[str] = mapped_column(String(20), nullable=False)  # مثال "P1" أو "V1"
    is_visitor: Mapped[bool] = mapped_column(Boolean, default=False)
    is_sold: Mapped[bool] = mapped_column(Boolean, default=False)

    project: Mapped["Project"] = relationship(back_populates="parking_spots")
    unit: Mapped["Unit"] = relationship(back_populates="parking_spots")
