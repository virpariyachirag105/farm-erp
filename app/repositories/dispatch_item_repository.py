from sqlalchemy.orm import Session

from app.models.dispatch_item import DispatchItem
from app.schemas.dispatch_item import DispatchItemRequest

class DispatchItemRepository:

    def create(self, db: Session, dispatch_item: DispatchItem):
        db.add(dispatch_item)
        db.flush()
        db.refresh(dispatch_item)
        return dispatch_item

    def get_dispatch_item_list(self, db: Session):
        return db.query(DispatchItem).all()

    def get_dispatch_item_by_id(self, db: Session, dispatch_item_id: int):
        return db.query(DispatchItem).filter(DispatchItem.id == dispatch_item_id).first()

    def update(self, db: Session, dispatch_item: DispatchItem):
        # existing_dispatch_item = db.query(DispatchItem).filter(DispatchItem.id == dispatch_item_id).first()
        # if existing_dispatch_item is None:
        #     return None

        # existing_dispatch_item.dispatch_id = dispatch_item_data.dispatch_id
        # existing_dispatch_item.farm_id = dispatch_item_data.farm_id
        # existing_dispatch_item.product_id = dispatch_item_data.product_id
        # existing_dispatch_item.source_type = dispatch_item_data.source_type
        # existing_dispatch_item.variety = dispatch_item_data.variety
        # existing_dispatch_item.grade = dispatch_item_data.grade
        # existing_dispatch_item.box_size_kg = dispatch_item_data.box_size_kg
        # existing_dispatch_item.box_quantity = dispatch_item_data.box_quantity
        # existing_dispatch_item.total_weight_kg = dispatch_item_data.total_weight_kg
        # existing_dispatch_item.price_per_box = dispatch_item_data.price_per_box
        # existing_dispatch_item.total_amount = dispatch_item_data.total_amount
        # existing_dispatch_item.remarks = dispatch_item_data.remarks

        db.flush()
        db.refresh(dispatch_item)
        return dispatch_item

    def delete(self, db: Session, dispatch_item_id: int):
        existing_dispatch_item = db.query(DispatchItem).filter(DispatchItem.id == dispatch_item_id).first()
        if existing_dispatch_item is None:
            return None

        db.delete(existing_dispatch_item)
        db.commit()
        return existing_dispatch_item
