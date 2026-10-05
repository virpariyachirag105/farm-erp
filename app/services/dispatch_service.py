from sqlalchemy.orm import Session
from app.schemas.dispatch_item import DispatchItemRequest
from fastapi import HTTPException, status
from datetime import datetime

from app.models.dispatch import Dispatch
from app.models.dispatch_item import DispatchItem
from app.models.free_dispatch_item import FreeDispatchItem
from app.models.dispatch_settlement import DispatchSettlement
from app.schemas.dispatch import DispatchRequest, DispatchCreateWithItems, DispatchUpdateWithItems
from app.repositories.dispatch_repository import DispatchRepository
from app.repositories.dealer_repository import DealerRepository
from app.repositories.season_repository import SeasonRepository
from app.repositories.farm_repository import FarmRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.season_partner_repository import SeasonPartnerRepository
from app.services.dispatch_item_service import DispatchItemService

from app.core.rbac import get_partner_scope
from app.models.user import User

class DispatchService:

    def __init__(self):
        self.dispatch_repository = DispatchRepository()
        self.dealer_repository = DealerRepository()
        self.season_repository = SeasonRepository()
        self.farm_repository = FarmRepository()
        self.product_repository = ProductRepository()
        self.dispatch_item_service = DispatchItemService()
        self.season_partner_repository = SeasonPartnerRepository()


    def _validate_dealer_and_season(self, db: Session, dealer_id: int | None, season_id: int | None):
        dealer = self.dealer_repository.get_dealer_by_id(db, dealer_id)
        if dealer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dealer not found."
            )
        
        season = self.season_repository.get_season_by_id(db, season_id)
        if season is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Season not found."
            )

    def create_dispatch(self, db: Session, dispatch_data: DispatchRequest):

        self._validate_dealer_and_season(db, dispatch_data.dealer_id, dispatch_data.season_id)

        if dispatch_data.dispatch_date and dispatch_data.dealer_id:
            duplicate = self.dispatch_repository.get_by_date_and_dealer(
                db, dispatch_data.dispatch_date, dispatch_data.dealer_id
            )
            if duplicate:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"A dispatch for this dealer on {dispatch_data.dispatch_date} already exists (Dispatch #{duplicate.dispatch_no})."
                )

        existing_dispatch = self.dispatch_repository.get_by_dispatch_no(db, dispatch_data.dispatch_no)

        if existing_dispatch:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Dispatch number already exists."
            )

        dispatch = Dispatch(
            dispatch_no=dispatch_data.dispatch_no,
            dispatch_date=dispatch_data.dispatch_date,
            season_id=dispatch_data.season_id,
            dealer_id=dispatch_data.dealer_id,
            vehicle_no=dispatch_data.vehicle_no,
            driver_name=dispatch_data.driver_name,
            transport_name=dispatch_data.transport_name,
            transport_charge=dispatch_data.transport_charge,
            total_boxes=dispatch_data.total_boxes,
            total_weight_kg=dispatch_data.total_weight_kg,
            total_amount=dispatch_data.total_amount,
            remarks=dispatch_data.remarks,
            status=dispatch_data.status,
            created_by=dispatch_data.created_by
        )

        return self.dispatch_repository.create(db, dispatch)

    def get_dispatch_list(self, db: Session, current_user: User | None = None):
        season_ids = None
        farm_ids = None
        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                season_ids = scope["season_ids"]
                farm_ids = scope["farm_ids"]

        return self.dispatch_repository.get_dispatch_list(db, season_ids=season_ids, farm_ids=farm_ids)

    def get_dispatch_by_id(self, db: Session, dispatch_id: int, current_user: User | None = None):

        #dispatch = self.dispatch_repository.get_dispatch_by_id(db, dispatch_id)
        dispatch = self.dispatch_repository.get_dispatch_detail(db, dispatch_id)

        if not dispatch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispatch not found."
            )

        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                if dispatch.season_id not in scope["season_ids"]:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied to this dispatch."
                    )

        return dispatch

    def update_dispatch(self, db: Session, dispatch_data: DispatchRequest, dispatch_id: int):

        dispatch = self.dispatch_repository.get_dispatch_by_id(db, dispatch_id)

        if dispatch is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispatch not found."
            )

        self._validate_dealer_and_season(db, dispatch_data.dealer_id, dispatch_data.season_id)

        existing_dispatch = self.dispatch_repository.get_by_dispatch_no(
            db,
            dispatch_data.dispatch_no,
            dispatch_id
        )

        if existing_dispatch:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Dispatch number already exists."
            )

        return self.dispatch_repository.update(db, dispatch_id, dispatch_data)

    def delete_dispatch(self, db: Session, dispatch_id: int):

        dispatch = self.dispatch_repository.get_dispatch_by_id(db, dispatch_id)

        if dispatch is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispatch not found."
            )

        # Delete child records first to satisfy foreign key constraints
        db.query(FreeDispatchItem).filter(FreeDispatchItem.dispatch_id == dispatch_id).delete(synchronize_session=False)
        db.query(DispatchSettlement).filter(DispatchSettlement.dispatch_id == dispatch_id).delete(synchronize_session=False)
        db.query(DispatchItem).filter(DispatchItem.dispatch_id == dispatch_id).delete(synchronize_session=False)

        return self.dispatch_repository.delete(db, dispatch_id)

    def create_dispatch_with_items(self, db: Session, dispatch_data: DispatchCreateWithItems ):
        self._validate_dealer_and_season(db, dispatch_data.dealer_id, dispatch_data.season_id)

        if dispatch_data.dispatch_date and dispatch_data.dealer_id:
            duplicate = self.dispatch_repository.get_by_date_and_dealer(
                db, dispatch_data.dispatch_date, dispatch_data.dealer_id
            )
            if duplicate:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"A dispatch for this dealer on {dispatch_data.dispatch_date} already exists (Dispatch #{duplicate.dispatch_no})."
                )

        season_farm_ids = self.season_partner_repository.get_farms_by_season(db,dispatch_data.season_id)

        dispatch = Dispatch(
            dispatch_no = f"DISP-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            dispatch_date=dispatch_data.dispatch_date,
            season_id=dispatch_data.season_id,
            dealer_id=dispatch_data.dealer_id,
            vehicle_no=dispatch_data.vehicle_no,
            driver_name=dispatch_data.driver_name,
            transport_name=dispatch_data.transport_name,
            transport_charge=dispatch_data.transport_charge,
            remarks=dispatch_data.remarks,
            status=dispatch_data.status,
            created_by=dispatch_data.created_by
        )

        dispatch = self.dispatch_repository.create(db, dispatch)

        for item_data in dispatch_data.items:
            if (item_data.farm_id is not None and item_data.farm_id not in season_farm_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Farm is not associated with the selected season."
                )

            dispatch_item_data = DispatchItemRequest(
                dispatch_id=dispatch.id,
                farm_id=item_data.farm_id,
                product_id=item_data.product_id,
                source_type=item_data.source_type,
                variety=item_data.variety,
                grade=item_data.grade,
                box_size_kg=item_data.box_size_kg,
                box_quantity=item_data.box_quantity,
                price_per_box=item_data.price_per_box,
                remarks=item_data.remarks
            )

            self.dispatch_item_service.create_dispatch_item(db, dispatch_item_data)

        dispatch.total_boxes = sum(
            item.box_quantity
            for item in dispatch.items
        )

        dispatch.total_weight_kg = sum(
            item.total_weight_kg
            for item in dispatch.items
        )

        dispatch.total_amount = round(sum(
            item.total_amount
            for item in dispatch.items
        ))

        try:
            db.commit()
            db.refresh(dispatch)

            return dispatch

        except Exception:
            db.rollback()
            raise

    def update_dispatch_with_items(self, db: Session, dispatch_data: DispatchUpdateWithItems, dispatch_id: int,):
        dispatch = self.dispatch_repository.get_dispatch_detail(db, dispatch_id)
        if dispatch is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispatch not found."
            )

        self._validate_dealer_and_season(db, dispatch_data.dealer_id, dispatch_data.season_id)

        if dispatch_data.dispatch_date and dispatch_data.dealer_id:
            duplicate = self.dispatch_repository.get_by_date_and_dealer(
                db, dispatch_data.dispatch_date, dispatch_data.dealer_id, exclude_dispatch_id=dispatch_id
            )
            if duplicate:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"A dispatch for this dealer on {dispatch_data.dispatch_date} already exists (Dispatch #{duplicate.dispatch_no})."
                )

        season_farm_ids = self.season_partner_repository.get_farms_by_season(db,dispatch_data.season_id)

        dispatch.dispatch_date = dispatch_data.dispatch_date
        dispatch.season_id = dispatch_data.season_id
        dispatch.dealer_id = dispatch_data.dealer_id
        dispatch.vehicle_no = dispatch_data.vehicle_no
        dispatch.driver_name = dispatch_data.driver_name
        dispatch.transport_name = dispatch_data.transport_name
        dispatch.transport_charge = dispatch_data.transport_charge
        dispatch.remarks = dispatch_data.remarks
        dispatch.status = dispatch_data.status

        existing_items = {
            item.id: item
            for item in dispatch.items
        }

        # for item_id, item in existing_items.items():
        #     print(f"EXIST ITEM ID: {item_id}")
        #     print(vars(item))
        # exit()
        processed_item_ids = set()
        dispatch_total_boxes = 0
        dispatch_total_weight_kg = 0
        dispatch_total_amount = 0
        for item_data in dispatch_data.items:
            if (item_data.farm_id is not None and item_data.farm_id not in season_farm_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Farm is not associated with the selected season."
                )

            if item_data.id is not None:
                # Existing item → UPDATE
                existing_item = existing_items.get(item_data.id)
                if not existing_item:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Dispatch item {item_data.id} not found."
                    )
                updated_item = self.dispatch_item_service.update_dispatch_item(db, existing_item, item_data)
                dispatch_total_boxes += updated_item.box_quantity
                dispatch_total_weight_kg += updated_item.total_weight_kg
                dispatch_total_amount += updated_item.total_amount

                processed_item_ids.add(item_data.id)
            else:
                # id is None → CREATE
                new_dispatch_item_data = DispatchItemRequest(
                    dispatch_id=dispatch.id,
                    farm_id=item_data.farm_id,
                    product_id=item_data.product_id,
                    source_type=item_data.source_type,
                    variety=item_data.variety,
                    grade=item_data.grade,
                    box_size_kg=item_data.box_size_kg,
                    box_quantity=item_data.box_quantity,
                    price_per_box=item_data.price_per_box,
                    remarks=item_data.remarks
                )

                new_item = self.dispatch_item_service.create_dispatch_item(db, new_dispatch_item_data)
                dispatch_total_boxes += new_item.box_quantity
                dispatch_total_weight_kg += new_item.total_weight_kg
                dispatch_total_amount += new_item.total_amount

        # for item_id in processed_item_ids:
        #     update_dispatch_item = existing_items[item_id]
        #     self.dispatch_item_service.update_dispatch_item(db, update_dispatch_item, item_id)
        # print("processed_item_ids", processed_item_ids);
        delete_item_ids = set(existing_items.keys()) - processed_item_ids
        # print("delete_item_ids", delete_item_ids);
            
        for delete_id in delete_item_ids:
            # Delete any free dispatch items referencing this dispatch item first
            db.query(FreeDispatchItem).filter(FreeDispatchItem.dispatch_item_id == delete_id).delete(synchronize_session=False)
            db.delete(existing_items[delete_id])

        dispatch.total_boxes = dispatch_total_boxes
        dispatch.total_weight_kg = dispatch_total_weight_kg
        dispatch.total_amount = round(dispatch_total_amount)

        try:
            db.commit()
            db.refresh(dispatch)

            return dispatch

        except Exception:
            db.rollback()
            raise