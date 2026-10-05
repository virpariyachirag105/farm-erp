from dataclasses import Field
from datetime import date
from pydantic import BaseModel, Field
from decimal import Decimal


class DispatchSettlementRequest(BaseModel):
    dispatch_id: int
    settlement_date: date | None = None
    loss_amount: Decimal = Field(gt=0)
    loss_remarks: str | None = None
    remarks: str | None = None

class DispatchSettlementResponse(BaseModel):
    id: int
    dispatch_id: int
    settlement_date: date | None = None
    loss_amount: Decimal
    loss_remarks: str | None = None
    remarks: str | None = None

    class Config:
        from_attributes = True