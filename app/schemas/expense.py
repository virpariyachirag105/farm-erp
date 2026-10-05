from datetime import date
from pydantic import BaseModel, Field
from decimal import Decimal


class ExpenseRequest(BaseModel):
    season_id: int
    farm_id: int
    expense_date: date | None = None
    expense_type: str | None = None
    description: str | None = None
    amount: Decimal = Field(gt=0)
    paid_to: str | None = None
    payment_mode: str | None = None
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

class ExpenseResponse(BaseModel):
    id: int
    season_id: int
    season: SeasonSummary
    farm_id: int
    farm: FarmSummary
    expense_date: date | None = None
    expense_type: str | None = None
    description: str | None = None
    amount: Decimal
    paid_to: str | None = None
    payment_mode: str | None = None
    remarks: str | None = None
    created_by: int
    creator: CreatorSummary

    class Config:
        from_attributes = True