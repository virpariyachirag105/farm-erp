from pydantic import BaseModel
from app.common.enum import FarmType


class FarmRequest(BaseModel):
    name: str
    location: str | None = None
    owner_name: str
    farm_type: FarmType
    is_active: bool = True

class FarmResponse(BaseModel):
    id: int
    name: str
    location: str | None = None
    owner_name: str
    farm_type: FarmType
    is_active: bool

    class Config:
        from_attributes = True