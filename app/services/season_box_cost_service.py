from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.rbac import get_partner_scope
from app.models.season_box_cost import SeasonBoxCost
from app.models.user import User
from app.schemas.season_box_cost import SeasonBoxCostRequest
from app.repositories.season_box_cost_repository import SeasonBoxCostRepository
from app.repositories.season_partner_repository import SeasonPartnerRepository
from app.repositories.season_repository import SeasonRepository
from app.repositories.farm_repository import FarmRepository

class SeasonBoxCostService:

    def __init__(self):
        self.season_box_cost_repository = SeasonBoxCostRepository()
        self.season_partner_repository = SeasonPartnerRepository()
        self.season_repository = SeasonRepository()
        self.farm_repository = FarmRepository()

    def _validate_foreign_keys(self, db: Session, season_id: int, farm_id: int | None):
        season = self.season_repository.get_season_by_id(db, season_id)
        if season is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Season not found."
            )

        if farm_id is not None:
            farm = self.farm_repository.get_farm_by_id(db, farm_id)
            if farm is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Farm not found."
                )

    def create_season_box_cost(self, db: Session, season_box_cost_data: SeasonBoxCostRequest):
        season_farm_ids = self.season_partner_repository.get_farms_by_season(db,season_box_cost_data.season_id)
        if (season_box_cost_data.farm_id is not None and season_box_cost_data.farm_id not in season_farm_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Farm is not associated with the selected season."
            )

        self._validate_foreign_keys(
            db,
            season_box_cost_data.season_id,
            season_box_cost_data.farm_id
        )

        season_box_cost = SeasonBoxCost(
            season_id=season_box_cost_data.season_id,
            farm_id=season_box_cost_data.farm_id,
            box_size_kg=season_box_cost_data.box_size_kg,
            total_boxes=season_box_cost_data.total_boxes,
            price_per_box=season_box_cost_data.price_per_box,
            total_amount=season_box_cost_data.total_boxes * season_box_cost_data.price_per_box,
            remarks=season_box_cost_data.remarks,
            created_by=season_box_cost_data.created_by
        )

        return self.season_box_cost_repository.create(db, season_box_cost)

    def get_season_box_cost_list(self, db: Session, season_id: int | None = None, farm_id: int | None = None, current_user: User | None = None):
        allowed_season_ids = None
        allowed_farm_ids = None
        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                allowed_season_ids = scope["season_ids"]
                allowed_farm_ids = scope["farm_ids"]

        return self.season_box_cost_repository.get_season_box_cost_list(
            db, season_id=season_id, farm_id=farm_id,
            allowed_season_ids=allowed_season_ids, allowed_farm_ids=allowed_farm_ids
        )

    def get_season_box_cost_by_id(self, db: Session, season_box_cost_id: int, current_user: User | None = None):

        season_box_cost = self.season_box_cost_repository.get_season_box_cost_by_id(db, season_box_cost_id)

        if season_box_cost is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Season box cost not found."
            )

        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                if season_box_cost.season_id not in scope["season_ids"]:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied to this season box cost."
                    )

        return season_box_cost

    def update_season_box_cost(self, db: Session, season_box_cost_data: SeasonBoxCostRequest, season_box_cost_id: int):
        season_farm_ids = self.season_partner_repository.get_farms_by_season(db,season_box_cost_data.season_id)
        if (season_box_cost_data.farm_id is not None and season_box_cost_data.farm_id not in season_farm_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Farm is not associated with the selected season."
            )

        season_box_cost = self.season_box_cost_repository.get_season_box_cost_by_id(db, season_box_cost_id)
        if season_box_cost is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Season box cost not found."
            )

        self._validate_foreign_keys(db, season_box_cost_data.season_id, season_box_cost_data.farm_id)

        return self.season_box_cost_repository.update(db, season_box_cost_id, season_box_cost_data)

    def delete_season_box_cost(self, db: Session, season_box_cost_id: int):

        season_box_cost = self.season_box_cost_repository.get_season_box_cost_by_id(db, season_box_cost_id)

        if season_box_cost is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Season box cost not found."
            )

        return self.season_box_cost_repository.delete(db, season_box_cost_id)
