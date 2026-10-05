from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.rbac import get_partner_scope
from app.models.farm import Farm
from app.models.user import User
from app.schemas.farm import FarmRequest
from app.repositories.farm_repository import FarmRepository

class FarmService:

    def __init__(self):
        self.farm_repository = FarmRepository()

    def create_farm(self, db: Session, farm_data: FarmRequest):

        existing_farm = self.farm_repository.get_by_name(db, farm_data.name)
        
        if existing_farm:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Farm name already exists."
            )

        farm = Farm(
            name=farm_data.name,
            location=farm_data.location,
            owner_name=farm_data.owner_name,
            farm_type=farm_data.farm_type,
            is_active=farm_data.is_active
        )

        return self.farm_repository.create(db, farm)

    def get_farm_list(self, db: Session, current_user: User | None = None):
        allowed_ids = None
        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                allowed_ids = scope["farm_ids"]

        return self.farm_repository.get_farm_list(db, allowed_ids=allowed_ids)

    def get_farm_by_id(self, db: Session, farm_id: int, current_user: User | None = None):

        farm = self.farm_repository.get_farm_by_id(db, farm_id)

        if not farm:
            raise HTTPException(
                status_code = status.HTTP_404_NOT_FOUND,
                detail = "Farm not found."
            )

        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                if farm.id not in scope["farm_ids"]:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied to this farm."
                    )

        return farm

    def update_farm(self, db: Session, farm_data: FarmRequest, farm_id):

        farm = self.farm_repository.get_farm_by_id(db, farm_id)

        if farm is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Farm not found."
            )

        existing_farm = self.farm_repository.get_by_name(
                db,
                farm_data.name,
                farm_id
            )

        if existing_farm:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Farm name already exists."
            )

        return self.farm_repository.update(
                db,
                farm_id,
                farm_data
            )

    def delete_farm(self, db: Session, farm_id):

        farm = self.farm_repository.get_farm_by_id(db, farm_id)

        if farm is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Farm not found."
            )

        return self.farm_repository.delete(
                db,
                farm_id
            )