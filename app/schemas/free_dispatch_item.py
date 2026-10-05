from datetime import date
from app.models import free_dispatch_item
from pydantic import BaseModel, Field
from decimal import Decimal


class FreeDispatchItemRequest(BaseModel):
    dispatch_id: int
    dispatch_item_id: int | None = None
    distribution_date: date | None = None
    box_quantity: Decimal = Field(gt=0)
    remarks: str | None = None

class DispatchItemSummary(BaseModel):
    id:int
    price_per_box:Decimal

    class Config:
        from_attributes = True

class FreeDispatchItemResponse(BaseModel):
    id: int
    dispatch_id: int
    dispatch_item_id: int | None = None
    distribution_date: date | None = None
    box_quantity: Decimal
    remarks: str | None = None

    class Config:
        from_attributes = True

class FreeDispatchItemListResponse(FreeDispatchItemResponse):
    dispatch_item:DispatchItemSummary
        