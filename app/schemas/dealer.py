from pydantic import BaseModel
from app.common.enum import DealerType
from decimal import Decimal


class DealerRequest(BaseModel):
    name: str
    city: str | None = None
    mobile: str | None = None
    address: str | None = None
    commission_type: DealerType
    commission_value: Decimal = 10.00
    is_active: bool = True

class DealerResponse(BaseModel):
    id: int
    name: str
    city: str | None = None
    mobile: str | None = None
    address: str | None = None
    commission_type: DealerType
    commission_value: Decimal = 10.00
    is_active: bool = True

    class Config:
        from_attributes = True