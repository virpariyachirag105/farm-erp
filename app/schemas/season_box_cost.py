from pydantic import BaseModel, Field
from app.common.enum import BoxSize
from decimal import Decimal

class SeasonBoxCostRequest(BaseModel):
    season_id: int
    farm_id: int
    box_size_kg: BoxSize
    total_boxes: Decimal = Field(gt=0)
    price_per_box: Decimal = Field(gt=0)
    remarks: str | None = None
    created_by: int

class SeasonSummary(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class FarmSummary(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class CreatorSummary(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class SeasonBoxCostResponse(BaseModel):
    id: int
    season_id: int
    season: SeasonSummary
    farm_id: int
    farm: FarmSummary
    box_size_kg: BoxSize
    total_boxes: Decimal
    price_per_box: Decimal
    total_amount: Decimal
    remarks: str | None = None
    created_by: int
    creator: CreatorSummary

    class Config:
        from_attributes = True