from pydantic import BaseModel
from app.common.enum import SourceType, BoxSize
from decimal import Decimal


class DispatchItemRequest(BaseModel):
    dispatch_id: int
    farm_id: int | None = None
    product_id: int | None = None
    source_type: SourceType
    variety: str | None = None
    grade: str | None = None
    box_size_kg: BoxSize
    box_quantity: Decimal
    price_per_box: Decimal
    remarks: str | None = None

class FarmSummary(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class ProductSummary(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class DispatchItemResponse(BaseModel):
    id: int
    dispatch_id: int
    farm_id: int | None = None
    farm: FarmSummary | None = None
    product_id: int | None = None
    product: ProductSummary | None = None
    source_type: SourceType
    variety: str | None = None
    grade: str | None = None
    box_size_kg: BoxSize
    box_quantity: Decimal
    total_weight_kg: Decimal
    price_per_box: Decimal
    total_amount: Decimal
    remarks: str | None = None

    class Config:
        from_attributes = True