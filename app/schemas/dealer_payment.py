from datetime import date
from pydantic import BaseModel, Field
from decimal import Decimal


class DealerPaymentRequest(BaseModel):
    dealer_id: int
    season_id: int | None = None
    payment_date: date | None = None
    amount: Decimal = Field(gt=0)
    payment_mode: str | None = None
    reference_no: str | None = None
    received_by: str | None = None
    remarks: str | None = None
    created_by: int

class DealerSummary(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class SeasonSummary(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class CreatorSummary(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class DealerPaymentResponse(BaseModel):
    id: int
    dealer_id: int
    dealer: DealerSummary
    season_id: int | None = None
    season: SeasonSummary | None = None
    payment_date: date | None = None
    amount: Decimal
    payment_mode: str | None = None
    reference_no: str | None = None
    received_by: str | None = None
    remarks: str | None = None
    created_by: int
    creator: CreatorSummary

    class Config:
        from_attributes = True