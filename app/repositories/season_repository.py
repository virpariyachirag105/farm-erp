from sqlalchemy.orm import Session

from app.models.season import Season
from app.schemas.season import SeasonRequest

class SeasonRepository:

    def create(self, db:Session, season:Season):
        db.add(season)
        db.commit()
        db.refresh(season)
        return season

    def get_by_name(self, db: Session, name: str, season_id: int = None):

        season_query = db.query(Season)
        if season_id is not None:
            season_query = season_query.filter(Season.id != season_id)
        
        season_query = season_query.filter(Season.name == name).first()
        return season_query

    def get_season_list(self, db: Session, allowed_ids: list[int] | None = None):
        query = db.query(Season)
        if allowed_ids is not None:
            query = query.filter(Season.id.in_(allowed_ids))
        return query.order_by(Season.id.desc()).all()

    def get_season_by_id(self, db: Session, season_id):
        return db.query(Season).filter(Season.id == season_id).first()

    def update(self, db: Session, season_id: int, season_data: SeasonRequest):
        existing_season = ( db.query(Season).filter(Season.id == season_id).first())
        if existing_season is None:
            return None

        existing_season.name = season_data.name
        existing_season.start_date = season_data.start_date
        existing_season.end_date = season_data.end_date
        existing_season.status = season_data.status

        db.commit()
        db.refresh(existing_season)

        return existing_season

    def delete(self, db: Session, season_id: int):
        existing_season = db.query(Season).filter(Season.id == season_id).first()
        if existing_season is None:
            return None

        db.delete(existing_season)
        db.commit()
        return existing_season