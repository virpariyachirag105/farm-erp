from itertools import count
from operator import countOf
from sqlalchemy.orm import Session
from app.models import dispatch_item
from fastapi import HTTPException, status

from app.models.free_dispatch_item import FreeDispatchItem
from app.schemas.free_dispatch_item import FreeDispatchItemRequest
from app.repositories.free_dispatch_item_repository import FreeDispatchItemRepository
from app.repositories.dispatch_repository import DispatchRepository
from app.repositories.dispatch_item_repository import DispatchItemRepository

class FreeDispatchItemService:

    def __init__(self):
        self.free_dispatch_item_repository = FreeDispatchItemRepository()
        self.dispatch_repository = DispatchRepository()
        self.dispatch_item_repository = DispatchItemRepository()

    # def _validate_foreign_keys(self, db: Session, dispatch_id: int, dispatch_item_id: int | None):
    #     dispatch = self.dispatch_repository.get_dispatch_by_id(db, dispatch_id)
    #     if dispatch is None:
    #         raise HTTPException(
    #             status_code=status.HTTP_404_NOT_FOUND,
    #             detail="Dispatch not found."
    #         )

    #     if dispatch_item_id is not None:
    #         dispatch_item = self.dispatch_item_repository.get_dispatch_item_by_id(db, dispatch_item_id)
    #         if dispatch_item is None:
    #             raise HTTPException(
    #                 status_code=status.HTTP_404_NOT_FOUND,
    #                 detail="Dispatch item not found."
    #             )

    def create_free_dispatch_item(self, db: Session, free_dispatch_item_data: FreeDispatchItemRequest):
        check_dispatch_item_data = self.dispatch_repository.get_dispatch_detail_by_item_id(
            db, free_dispatch_item_data.dispatch_id, free_dispatch_item_data.dispatch_item_id
        )
        if check_dispatch_item_data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispatch or Dispatch item not found."
            )

        # Check existing free items for this specific dispatch item
        existing_free_items = self.free_dispatch_item_repository.get_free_dispatch_item_by_dispatch_id(
            db, free_dispatch_item_data.dispatch_id
        )
        current_free_boxes_for_item = sum(
            item.box_quantity
            for item in existing_free_items
            if item.dispatch_item_id == free_dispatch_item_data.dispatch_item_id
        )

        # Find target dispatch item to get its total box_quantity
        target_dispatch_item = next(
            (item for item in check_dispatch_item_data.items if item.id == free_dispatch_item_data.dispatch_item_id),
            None
        )

        if target_dispatch_item is not None:
            new_total = current_free_boxes_for_item + free_dispatch_item_data.box_quantity
            if new_total > target_dispatch_item.box_quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Total free boxes ({new_total}) cannot exceed available item boxes ({target_dispatch_item.box_quantity}). Currently allocated: {current_free_boxes_for_item}."
                )

        free_dispatch_item = FreeDispatchItem(
            dispatch_id=free_dispatch_item_data.dispatch_id,
            dispatch_item_id=free_dispatch_item_data.dispatch_item_id,
            distribution_date=free_dispatch_item_data.distribution_date,
            box_quantity=free_dispatch_item_data.box_quantity,
            remarks=free_dispatch_item_data.remarks
        )

        free_dispatch_data = self.free_dispatch_item_repository.create(db, free_dispatch_item)

        try:
            db.commit()
            db.refresh(free_dispatch_data)
            return free_dispatch_data
        except Exception:
            db.rollback()
            raise

    def get_free_dispatch_item_list(self, db: Session, dispatch_id):
        return self.free_dispatch_item_repository.get_free_dispatch_item_by_dispatch_id(db, dispatch_id)

    def get_free_dispatch_item_by_id(self, db: Session, free_dispatch_item_id: int):
        free_dispatch_item = self.free_dispatch_item_repository.get_free_dispatch_item_by_id(db, free_dispatch_item_id)
        if not free_dispatch_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Free dispatch item not found."
            )
        return free_dispatch_item

    def update_free_dispatch_item(self, db: Session, free_dispatch_item_data: FreeDispatchItemRequest, free_dispatch_item_id: int):
        free_dispatch_item = self.free_dispatch_item_repository.get_free_dispatch_item_by_id(db, free_dispatch_item_id)
        if free_dispatch_item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Free dispatch item not found."
            )
        
        check_dispatch_item_data = self.dispatch_repository.get_dispatch_detail_by_item_id(
            db, free_dispatch_item_data.dispatch_id, free_dispatch_item_data.dispatch_item_id
        )
        if check_dispatch_item_data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispatch or Dispatch item not found."
            )

        existing_free_items = self.free_dispatch_item_repository.get_free_dispatch_item_by_dispatch_id(
            db, free_dispatch_item_data.dispatch_id
        )
        current_free_boxes_for_item = sum(
            item.box_quantity
            for item in existing_free_items
            if item.dispatch_item_id == free_dispatch_item_data.dispatch_item_id and item.id != free_dispatch_item_id
        )

        target_dispatch_item = next(
            (item for item in check_dispatch_item_data.items if item.id == free_dispatch_item_data.dispatch_item_id),
            None
        )

        if target_dispatch_item is not None:
            new_total = current_free_boxes_for_item + free_dispatch_item_data.box_quantity
            if new_total > target_dispatch_item.box_quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Total free boxes ({new_total}) cannot exceed available item boxes ({target_dispatch_item.box_quantity}). Currently allocated in other entries: {current_free_boxes_for_item}."
                )

        free_dispatch_item.distribution_date = free_dispatch_item_data.distribution_date
        free_dispatch_item.box_quantity = free_dispatch_item_data.box_quantity
        free_dispatch_item.remarks = free_dispatch_item_data.remarks

        try:
            db.commit()
            db.refresh(free_dispatch_item)
            return free_dispatch_item
        except Exception:
            db.rollback()
            raise

    def delete_free_dispatch_item(self, db: Session, free_dispatch_item_id: int):

        free_dispatch_item = self.free_dispatch_item_repository.get_free_dispatch_item_by_id(db, free_dispatch_item_id)

        if free_dispatch_item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Free dispatch item not found."
            )

        return self.free_dispatch_item_repository.delete(db, free_dispatch_item_id)
