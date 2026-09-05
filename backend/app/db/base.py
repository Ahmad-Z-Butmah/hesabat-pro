"""استيراد النماذج لضمان تسجيلها لدى SQLAlchemy و Alembic."""

from app.db.base_class import Base
from app.models.user import User
from app.models.project import Project
from app.models.unit import Unit
from app.models.parking import ParkingSpot
from app.models.party import Party
from app.models.transaction import Transaction
from app.models.transaction_attachment import TransactionAttachment
from app.models.unit_sale import UnitSale
from app.models.sale_attachment import SaleAttachment

__all__ = [
    "Base",
    "User",
    "Project",
    "Unit",
    "ParkingSpot",
    "Party",
    "Transaction",
    "TransactionAttachment",
    "UnitSale",
    "SaleAttachment",
]
