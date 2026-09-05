from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.unit import UnitStatus, UnitType


class UnitBase(BaseModel):
    no: str
    floor: int
    status: UnitStatus = UnitStatus.available
    buyer_name: str | None = None
    unit_type: UnitType | None = None
    area: Decimal | None = None


class UnitCreate(UnitBase):
    project_id: int


class UnitUpdate(BaseModel):
    no: str | None = None
    floor: int | None = None
    status: UnitStatus | None = None
    buyer_name: str | None = None
    unit_type: UnitType | None = None
    area: Decimal | None = None


class UnitRead(UnitBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    assigned_parking_no: int | None = None


class PropertySetupIn(BaseModel):
    apartments_count: int = Field(0, ge=0)
    roofs_count: int = Field(0, ge=0)
    storages_count: int = Field(0, ge=0)
    studios_count: int = Field(0, ge=0)
    parking_count: int = Field(0, ge=0)
    default_apartment_area: Decimal | None = Field(None, gt=0)


class PropertySetupOut(BaseModel):
    apartments: int
    roofs: int
    storages: int
    studios: int
    parking: int
