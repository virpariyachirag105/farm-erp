from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.rbac import get_partner_scope
from app.models.season import Season
from app.models.user import User
from app.schemas.season import SeasonRequest
from app.repositories.season_repository import SeasonRepository

class SeasonService:

    def __init__(self):
        self.season_repository = SeasonRepository()

    def create_season(self, db: Session, season_data: SeasonRequest):

        existing_season = self.season_repository.get_by_name(
                db,
                season_data.name
            )

        if existing_season:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Season name already exists."
            )

        season = Season(
            name=season_data.name,
            start_date=season_data.start_date,
            end_date=season_data.end_date,
            status=season_data.status
        )

        return self.season_repository.create(db, season)


    def get_season_list(self, db: Session, current_user: User | None = None):
        allowed_ids = None
        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                allowed_ids = scope["season_ids"]

        return self.season_repository.get_season_list(db, allowed_ids=allowed_ids)

    def get_season_by_id(self, db: Session, season_id: int, current_user: User | None = None):

        season = self.season_repository.get_season_by_id(db, season_id)

        if not season:
            raise HTTPException(
                status_code = status.HTTP_404_NOT_FOUND,
                detail = "Season not found."
            )

        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                if season.id not in scope["season_ids"]:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied to this season."
                    )

        return season

    def update_season(self, db: Session, season_data: SeasonRequest, season_id):

        season = self.season_repository.get_season_by_id(db, season_id)

        if season is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Season not found."
            )

        existing_season = self.season_repository.get_by_name(
                db,
                season_data.name,
                season_id
            )

        if existing_season:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Season name already exists."
            )

        return self.season_repository.update(
                db,
                season_id,
                season_data
            )

    def delete_season(self, db: Session, season_id):

        season = self.season_repository.get_season_by_id(db, season_id)

        if season is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Season not found."
            )

        return self.season_repository.delete(db, season_id)