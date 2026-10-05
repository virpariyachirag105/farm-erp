from sqlalchemy.orm import Session
from app.common.enum import BoxSize, SourceType
from fastapi import HTTPException, status
from decimal import Decimal

from app.models.dispatch_item import DispatchItem
from app.models.free_dispatch_item import FreeDispatchItem
from app.schemas.dispatch_item import DispatchItemRequest
from app.repositories.dispatch_item_repository import DispatchItemRepository
from app.repositories.dispatch_repository import DispatchRepository
from app.repositories.farm_repository import FarmRepository
from app.repositories.product_repository import ProductRepository

class DispatchItemService:

    def __init__(self):
        self.dispatch_item_repository = DispatchItemRepository()
        self.dispatch_repository = DispatchRepository()
        self.farm_repository = FarmRepository()
        self.product_repository = ProductRepository()

    def _validate_foreign_keys(
        self,
        db: Session,
        dispatch_id: int,
        farm_id: int | None,
        product_id: int | None
    ):
        dispatch = self.dispatch_repository.get_dispatch_by_id(db, dispatch_id)
        if dispatch is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispatch not found."
            )

        if farm_id is not None:
            farm = self.farm_repository.get_farm_by_id(db, farm_id)
            if farm is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Farm not found."
                )

        if product_id is not None:
            product = self.product_repository.get_product_by_id(db, product_id)
            if product is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Product not found."
                )

    def create_dispatch_item(self, db: Session, dispatch_item_data: DispatchItemRequest):

        self._validate_foreign_keys(
            db,
            dispatch_item_data.dispatch_id,
            dispatch_item_data.farm_id,
            dispatch_item_data.product_id
        )

        if dispatch_item_data.source_type == SourceType.FARM:
            if dispatch_item_data.farm_id is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="farm_id is required when source_type is FARM."
                )

        if dispatch_item_data.box_size_kg == BoxSize.DOZEN:
            total_weight_kg = 0
        else:
            total_weight_kg = (
                dispatch_item_data.box_quantity
                * Decimal(dispatch_item_data.box_size_kg.value)
            )

        total_amount = Decimal(round(
            dispatch_item_data.box_quantity
            * dispatch_item_data.price_per_box
        ))

        dispatch_item = DispatchItem(
            dispatch_id=dispatch_item_data.dispatch_id,
            farm_id=dispatch_item_data.farm_id,
            product_id=dispatch_item_data.product_id,
            source_type=dispatch_item_data.source_type,
            variety=dispatch_item_data.variety,
            grade=dispatch_item_data.grade,
            box_size_kg=dispatch_item_data.box_size_kg.value,
            box_quantity=dispatch_item_data.box_quantity,
            total_weight_kg=total_weight_kg,
            price_per_box=dispatch_item_data.price_per_box,
            total_amount=total_amount,
            remarks=dispatch_item_data.remarks
        )

        return self.dispatch_item_repository.create(db, dispatch_item)

    def get_dispatch_item_list(self, db: Session):
        return self.dispatch_item_repository.get_dispatch_item_list(db)

    def get_dispatch_item_by_id(self, db: Session, dispatch_item_id: int):

        dispatch_item = self.dispatch_item_repository.get_dispatch_item_by_id(db, dispatch_item_id)

        if dispatch_item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispatch item not found."
            )

        return dispatch_item

    def update_dispatch_item(self, db: Session, existing_item: DispatchItem, item_data: DispatchItemRequest):
        self._validate_foreign_keys(
            db,
            existing_item.dispatch_id,
            item_data.farm_id,
            item_data.product_id
        )

        if item_data.source_type == SourceType.FARM:
            if item_data.farm_id is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="farm_id is required when source_type is FARM."
                )

        if item_data.box_size_kg == BoxSize.DOZEN:
            total_weight_kg = 0
        else:
            total_weight_kg = (
                item_data.box_quantity
                * Decimal(item_data.box_size_kg.value)
            )

        total_amount = Decimal(round(
            item_data.box_quantity
            * item_data.price_per_box
        ))

        existing_item.farm_id = item_data.farm_id
        existing_item.product_id = item_data.product_id
        existing_item.source_type = item_data.source_type
        existing_item.variety = item_data.variety
        existing_item.grade = item_data.grade
        existing_item.box_size_kg = item_data.box_size_kg.value
        existing_item.box_quantity = item_data.box_quantity
        existing_item.total_weight_kg = total_weight_kg
        existing_item.price_per_box = item_data.price_per_box
        existing_item.total_amount = total_amount
        existing_item.remarks = item_data.remarks
        return existing_item


    def delete_dispatch_item(self, db: Session, dispatch_item_id: int):

        dispatch_item = self.dispatch_item_repository.get_dispatch_item_by_id(db, dispatch_item_id)

        if dispatch_item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispatch item not found."
            )

        # Delete referencing FreeDispatchItem records first
        db.query(FreeDispatchItem).filter(FreeDispatchItem.dispatch_item_id == dispatch_item_id).delete(synchronize_session=False)

        return self.dispatch_item_repository.delete(db, dispatch_item_id)
