from datetime import date
from pydantic import BaseModel, Field
from decimal import Decimal


class SeasonPartnerRequest(BaseModel):
    season_id: int
    farm_id: int
    user_id: int | None = None
    partner_name: str | None = None
    partnership_percentage: Decimal | None = Field(default=None, ge=0, le=100)
    agreement_date: date | None = None
    remarks: str

class SeasonSummary(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class FarmSummary(BaseModel):
    id: int
    name: str
    farm_type: str | None = None

    class Config:
        from_attributes = True


class UserSummary(BaseModel):
    id: int
    name: str
    email: str | None = None

    class Config:
        from_attributes = True


class SeasonPartnerResponse(BaseModel):
    id: int
    season_id: int
    farm_id: int
    user_id: int | None = None
    partner_name: str | None = None
    partnership_percentage: Decimal | None = None
    agreement_date: date | None = None
    remarks: str
    season: SeasonSummary | None = None
    farm: FarmSummary | None = None
    user: UserSummary | None = None

    class Config:
        from_attributes = True