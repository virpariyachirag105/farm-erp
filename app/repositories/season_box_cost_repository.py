from sqlalchemy.orm import Session

from app.models.season_box_cost import SeasonBoxCost
from app.schemas.season_box_cost import SeasonBoxCostRequest

class SeasonBoxCostRepository:

    def create(self, db: Session, season_box_cost: SeasonBoxCost):
        db.add(season_box_cost)
        db.commit()
        db.refresh(season_box_cost)
        return season_box_cost

    def get_season_box_cost_list(self, db: Session, season_id=None, farm_id=None, allowed_season_ids: list[int] | None = None, allowed_farm_ids: list[int] | None = None):
        query = db.query(SeasonBoxCost)

        if season_id:
            query = query.filter(SeasonBoxCost.season_id == season_id)
        if farm_id:
            query = query.filter(SeasonBoxCost.farm_id == farm_id)
        if allowed_season_ids is not None:
            query = query.filter(SeasonBoxCost.season_id.in_(allowed_season_ids))
        if allowed_farm_ids is not None:
            query = query.filter(SeasonBoxCost.farm_id.in_(allowed_farm_ids))

        return query.all()

    def get_season_box_cost_by_id(self, db: Session, season_box_cost_id: int):
        return db.query(SeasonBoxCost).filter(SeasonBoxCost.id == season_box_cost_id).first()

    def update(self, db: Session, season_box_cost_id: int, season_box_cost_data: SeasonBoxCostRequest):
        existing_cost = db.query(SeasonBoxCost).filter(SeasonBoxCost.id == season_box_cost_id).first()
        if existing_cost is None:
            return None

        existing_cost.season_id = season_box_cost_data.season_id
        existing_cost.farm_id = season_box_cost_data.farm_id
        existing_cost.box_size_kg = season_box_cost_data.box_size_kg
        existing_cost.total_boxes = season_box_cost_data.total_boxes
        existing_cost.price_per_box = season_box_cost_data.price_per_box
        existing_cost.total_amount = season_box_cost_data.total_boxes * season_box_cost_data.price_per_box
        existing_cost.remarks = season_box_cost_data.remarks
        existing_cost.created_by = season_box_cost_data.created_by

        db.commit()
        db.refresh(existing_cost)
        return existing_cost

    def delete(self, db: Session, season_box_cost_id: int):
        existing_cost = db.query(SeasonBoxCost).filter(SeasonBoxCost.id == season_box_cost_id).first()
        if existing_cost is None:
            return None

        db.delete(existing_cost)
        db.commit()
        return existing_cost
