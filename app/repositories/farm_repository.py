from sqlalchemy.orm import Session

from app.models.farm import Farm
from app.schemas.farm import FarmRequest

class FarmRepository:

    def create(self, db: Session, farm:Farm):
        db.add(farm)
        db.commit()
        db.refresh(farm)
        return farm

    def get_by_name(self, db: Session, name: str, farm_id: int = None):

        farm_query = db.query(Farm)
        if farm_id is not None:
            farm_query = farm_query.filter(Farm.id != farm_id)
        
        farm_query = farm_query.filter(Farm.name == name).first()
        return farm_query

    def get_farm_list(self, db: Session, allowed_ids: list[int] | None = None):
        query = db.query(Farm)
        if allowed_ids is not None:
            query = query.filter(Farm.id.in_(allowed_ids))
        return query.all()

    def get_farm_by_id(self, db: Session, farm_id):
        return db.query(Farm).filter(Farm.id == farm_id).first()

    def update(self, db: Session, farm_id: int, farm_data: FarmRequest):
        existing_farm = ( db.query(Farm).filter(Farm.id == farm_id).first())
        if existing_farm is None:
            return None

        existing_farm.name = farm_data.name
        existing_farm.location = farm_data.location
        existing_farm.owner_name = farm_data.owner_name
        existing_farm.farm_type = farm_data.farm_type
        existing_farm.is_active = farm_data.is_active

        db.commit()
        db.refresh(existing_farm)

        return existing_farm

    def delete(self, db: Session, farm_id: int):
        existing_farm = ( db.query(Farm).filter(Farm.id == farm_id).first())
        if existing_farm is None:
            return None

        existing_farm.is_active = False

        db.commit()
        db.refresh(existing_farm)

        return existing_farm