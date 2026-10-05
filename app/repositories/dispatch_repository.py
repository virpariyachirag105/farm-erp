from sqlalchemy.orm import Session, joinedload

from app.models.dispatch import Dispatch
from app.schemas.dispatch import DispatchRequest
from app.models.dispatch_item import DispatchItem

class DispatchRepository:

    def create(self, db: Session, dispatch: Dispatch):
        db.add(dispatch)
        db.flush()
        db.refresh(dispatch)
        return dispatch

    def get_by_dispatch_no(self, db: Session, dispatch_no: str, dispatch_id: int = None):
        dispatch_query = db.query(Dispatch)
        if dispatch_id is not None:
            dispatch_query = dispatch_query.filter(Dispatch.id != dispatch_id)
        return dispatch_query.filter(Dispatch.dispatch_no == dispatch_no).first()

    def get_by_date_and_dealer(self, db: Session, dispatch_date, dealer_id: int, exclude_dispatch_id: int = None):
        query = db.query(Dispatch).filter(
            Dispatch.dispatch_date == dispatch_date,
            Dispatch.dealer_id == dealer_id
        )
        if exclude_dispatch_id is not None:
            query = query.filter(Dispatch.id != exclude_dispatch_id)
        return query.first()

    def get_dispatch_list(
        self,
        db: Session,
        season_ids: list[int] | None = None,
        farm_ids: list[int] | None = None
    ):
        query = db.query(Dispatch)
        if season_ids is not None:
            query = query.filter(Dispatch.season_id.in_(season_ids))
        if farm_ids is not None:
            query = query.filter(Dispatch.items.any(DispatchItem.farm_id.in_(farm_ids)))
        return query.order_by(Dispatch.dispatch_date.desc(), Dispatch.id.desc()).all()

    def get_dispatch_by_id(self, db: Session, dispatch_id: int):
        return db.query(Dispatch).filter(Dispatch.id == dispatch_id).first()

    def update(self, db: Session, dispatch_id: int, dispatch_data: DispatchRequest):
        existing_dispatch = db.query(Dispatch).filter(Dispatch.id == dispatch_id).first()
        if existing_dispatch is None:
            return None

        existing_dispatch.dispatch_no = dispatch_data.dispatch_no
        existing_dispatch.dispatch_date = dispatch_data.dispatch_date
        existing_dispatch.season_id = dispatch_data.season_id
        existing_dispatch.dealer_id = dispatch_data.dealer_id
        existing_dispatch.vehicle_no = dispatch_data.vehicle_no
        existing_dispatch.driver_name = dispatch_data.driver_name
        existing_dispatch.transport_name = dispatch_data.transport_name
        existing_dispatch.transport_charge = dispatch_data.transport_charge
        existing_dispatch.total_boxes = dispatch_data.total_boxes
        existing_dispatch.total_weight_kg = dispatch_data.total_weight_kg
        existing_dispatch.total_amount = dispatch_data.total_amount
        existing_dispatch.remarks = dispatch_data.remarks
        existing_dispatch.status = dispatch_data.status
        existing_dispatch.created_by = dispatch_data.created_by

        db.commit()
        db.refresh(existing_dispatch)
        return existing_dispatch

    def delete(self, db: Session, dispatch_id: int):
        existing_dispatch = db.query(Dispatch).filter(Dispatch.id == dispatch_id).first()
        if existing_dispatch is None:
            return None

        db.delete(existing_dispatch)
        db.commit()
        return existing_dispatch

    def get_dispatch_detail(self, db: Session, dispatch_id: int):
        return (
            db.query(Dispatch).options(
                joinedload(Dispatch.season),
                joinedload(Dispatch.dealer),
                joinedload(Dispatch.items).joinedload(DispatchItem.farm),
                joinedload(Dispatch.items).joinedload(DispatchItem.product)
            ).filter(Dispatch.id == dispatch_id).first()
        )
    
    def get_dispatch_detail_by_item_id(self, db: Session, dispatch_id: int, dispatch_item_id: int):
        return (
            db.query(Dispatch).options(
                joinedload(Dispatch.items)
            ).filter(
                Dispatch.id == dispatch_id,
                Dispatch.items.any(DispatchItem.id == dispatch_item_id)
            ).first()
        )
