from sqlalchemy.orm import Session,joinedload

from app.models.free_dispatch_item import FreeDispatchItem
from app.schemas.free_dispatch_item import FreeDispatchItemRequest

class FreeDispatchItemRepository:

    def create(self, db: Session, free_dispatch_item: FreeDispatchItem):
        db.add(free_dispatch_item)
        db.flush()
        db.refresh(free_dispatch_item)
        return free_dispatch_item

    def get_free_dispatch_item_list(self, db: Session):
        return db.query(FreeDispatchItem).all()

    def get_free_dispatch_item_by_id(self, db: Session, free_dispatch_item_id: int):
        return db.query(FreeDispatchItem).filter(FreeDispatchItem.id == free_dispatch_item_id).first()

    def update(self, db: Session, free_dispatch_item_id: int, free_dispatch_item_data: FreeDispatchItemRequest):
        existing_item = db.query(FreeDispatchItem).filter(FreeDispatchItem.id == free_dispatch_item_id).first()
        if existing_item is None:
            return None

        existing_item.dispatch_id = free_dispatch_item_data.dispatch_id
        existing_item.dispatch_item_id = free_dispatch_item_data.dispatch_item_id
        existing_item.distribution_date = free_dispatch_item_data.distribution_date
        existing_item.box_quantity = free_dispatch_item_data.box_quantity
        existing_item.remarks = free_dispatch_item_data.remarks

        db.commit()
        db.refresh(existing_item)
        return existing_item

    def delete(self, db: Session, free_dispatch_item_id: int):
        existing_item = db.query(FreeDispatchItem).filter(FreeDispatchItem.id == free_dispatch_item_id).first()
        if existing_item is None:
            return None

        db.delete(existing_item)
        db.commit()
        return existing_item

    def get_free_dispatch_item_by_dispatch_id(self, db: Session, dispatch_id: int):
        return db.query(FreeDispatchItem).options(
            joinedload(FreeDispatchItem.dispatch_item),
            joinedload(FreeDispatchItem.dispatch)
        ).filter(FreeDispatchItem.dispatch_id == dispatch_id).all()
