from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProjectBase(BaseModel):
    name: str
    location: str | None = None
    type: str | None = None
    mono: str | None = None
    gradient_start: str | None = None
    gradient_end: str | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    type: str | None = None
    mono: str | None = None
    gradient_start: str | None = None
    gradient_end: str | None = None


class ProjectRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int | None = None
    created_at: datetime
