from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.rbac import get_partner_scope
from app.models.season_partner import SeasonPartner
from app.models.user import User
from app.schemas.season_partner import SeasonPartnerRequest
from app.repositories.season_partner_repository import SeasonPartnerRepository
from app.repositories.farm_repository import FarmRepository
from app.repositories.season_repository import SeasonRepository

class SeasonPartnerService:

    def __init__(self):
        self.season_partner_repository = SeasonPartnerRepository()
        self.farm_repository = FarmRepository()
        self.season_repository = SeasonRepository()

    def _validate_farm_and_season(self, db: Session, farm_id: int, season_id: int):
        farm = self.farm_repository.get_farm_by_id(db, farm_id)
        if farm is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Farm not found."
            )

        season = self.season_repository.get_season_by_id(db, season_id)
        if season is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Season not found."
            )

    def create_season_partner(self, db: Session, season_partner_data: SeasonPartnerRequest):

        self._validate_farm_and_season(
            db,
            season_partner_data.farm_id,
            season_partner_data.season_id
        )

        season_partner_id = self.season_partner_repository.unique_farm_season(db, season_partner_data.season_id, season_partner_data.farm_id)
        if season_partner_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Farm is already exist for this season."
            )

        season_partner = SeasonPartner(
            season_id=season_partner_data.season_id,
            farm_id=season_partner_data.farm_id,
            user_id=season_partner_data.user_id,
            partner_name=season_partner_data.partner_name,
            partnership_percentage=season_partner_data.partnership_percentage,
            agreement_date=season_partner_data.agreement_date,
            remarks=season_partner_data.remarks
        )
        return self.season_partner_repository.create(db, season_partner)

    def get_season_partner_list(
        self,
        db: Session,
        season_id: int | None = None,
        farm_id: int | None = None,
        current_user: User | None = None
    ):
        allowed_ids = None
        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                allowed_ids = scope["season_partner_ids"]

        return self.season_partner_repository.get_season_partner_list(
            db,
            season_id=season_id,
            farm_id=farm_id,
            allowed_ids=allowed_ids
        )

    def get_season_partner_by_id(self, db: Session, season_partner_id: int, current_user: User | None = None):

        season_partner = self.season_partner_repository.get_season_partner_by_id(db, season_partner_id)

        if season_partner is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Season partner not found."
            )

        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                if season_partner.id not in scope["season_partner_ids"]:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied to this season partner."
                    )

        return season_partner

    def update_season_partner(self, db: Session, season_partner_data: SeasonPartnerRequest, season_partner_id: int):

        season_partner = self.season_partner_repository.get_season_partner_by_id(db, season_partner_id)

        if season_partner is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Season partner not found."
            )

        self._validate_farm_and_season(
            db,
            season_partner_data.farm_id,
            season_partner_data.season_id
        )

        return self.season_partner_repository.update(db, season_partner_id, season_partner_data)

    def delete_season_partner(self, db: Session, season_partner_id: int):

        season_partner = self.season_partner_repository.get_season_partner_by_id(db, season_partner_id)

        if season_partner is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Season partner not found."
            )

        return self.season_partner_repository.delete(db, season_partner_id)
