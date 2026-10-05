from datetime import date
from pydantic import BaseModel, Field
from decimal import Decimal


class PartnerSettlementRequest(BaseModel):
    season_partner_id: int
    settlement_date: date | None = None
    total_sales: Decimal = Field(gt=0)
    total_expenses: Decimal = Field(gt=0)
    partner_percentage: Decimal = Field(ge=0, le=100)
    amount_paid: Decimal
    payment_date: date | None = None
    payment_mode: str | None = None
    reference_no: str | None = None
    remarks: str | None = None
    image: str | None = None
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

class SeasonPartnerResponse(BaseModel):
    season: SeasonSummary
    farm: FarmSummary

    class Config:
        from_attributes = True

class PartnerSettlementResponse(BaseModel):
    id: int
    season_partner_id: int
    season_partner: SeasonPartnerResponse
    settlement_date: date | None = None
    total_sales: Decimal
    total_expenses: Decimal
    net_profit: Decimal
    partner_percentage: Decimal
    partner_amount: Decimal
    amount_paid: Decimal
    payment_date: date | None = None
    payment_mode: str | None = None
    reference_no: str | None = None
    remarks: str | None = None
    image: str | None = None
    created_by: int
    creator: CreatorSummary

    class Config:
        from_attributes = True

class SettlementImageUploadResponse(BaseModel):
    image_url: str