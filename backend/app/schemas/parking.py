from pydantic import BaseModel, ConfigDict


class ParkingSpotBase(BaseModel):
    code: str
    is_visitor: bool = False
    is_sold: bool = False
    unit_id: int | None = None


class ParkingSpotCreate(ParkingSpotBase):
    project_id: int


class ParkingSpotUpdate(BaseModel):
    code: str | None = None
    is_visitor: bool | None = None
    is_sold: bool | None = None
    unit_id: int | None = None


class ParkingSpotRead(ParkingSpotBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
