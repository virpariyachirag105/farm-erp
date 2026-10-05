from datetime import date
from pydantic import BaseModel, Field
from app.common.enum import SourceType, BoxSize
from app.schemas.dispatch_item import DispatchItemResponse
from decimal import Decimal

class DispatchRequest(BaseModel):
    dispatch_date: date | None = None
    season_id: int | None = None
    dealer_id: int | None = None
    vehicle_no: str | None = None
    driver_name: str | None = None
    transport_name: str | None = None
    transport_charge: Decimal = Field(default=0, ge=0)
    remarks: str | None = None
    status: str | None = None
    created_by: int

class SeasonSummary(BaseModel):
    id:int
    name:str

    class Config:
        from_attributes = True

class DealerSummary(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class DispatchResponse(BaseModel):
    id: int
    dispatch_no: str
    dispatch_date: date | None = None
    season_id: int | None = None
    season: SeasonSummary | None = None
    dealer_id: int | None = None
    dealer: DealerSummary | None = None
    vehicle_no: str | None = None
    driver_name: str | None = None
    transport_name: str | None = None
    transport_charge: Decimal
    total_boxes: Decimal
    total_weight_kg: Decimal
    total_amount: Decimal
    remarks: str | None = None
    status: str | None = None
    created_by: int

    items: list[DispatchItemResponse] = []

    class Config:
        from_attributes = True

class DispatchItemRequest(BaseModel):
    farm_id: int | None = None
    product_id: int | None = None
    source_type: SourceType
    variety: str | None = None
    grade: str | None = None
    box_size_kg: BoxSize
    box_quantity: Decimal = Field(gt=0)
    price_per_box: Decimal = Field(ge=0)
    remarks: str | None = None

class DispatchCreateWithItems(DispatchRequest):
    items: list[DispatchItemRequest] = Field(min_length=1)

class DispatchListResponse(BaseModel):
    id: int
    dispatch_no: str
    dispatch_date: date | None = None
    season_id: int | None = None
    season: SeasonSummary | None = None
    dealer_id: int | None = None
    dealer: DealerSummary | None = None
    transport_charge: Decimal
    total_boxes: Decimal
    total_amount: Decimal

    class Config:
        from_attributes = True

class DispatchItemUpdate(DispatchItemRequest):
    id: int | None = None

class DispatchUpdateWithItems(DispatchRequest):
    items: list[DispatchItemUpdate] = Field(min_length=1)