from sqlalchemy.orm import Session

from app.models.season_partner import SeasonPartner
from app.schemas.season_partner import SeasonPartnerRequest

class SeasonPartnerRepository:

    def create(self, db: Session, season_partner: SeasonPartner):
        db.add(season_partner)
        db.commit()
        db.refresh(season_partner)
        return season_partner

    def get_season_partner_list(
        self,
        db: Session,
        season_id: int | None = None,
        farm_id: int | None = None,
        allowed_ids: list[int] | None = None
    ):
        query = db.query(SeasonPartner)
        if season_id is not None:
            query = query.filter(SeasonPartner.season_id == season_id)
        if farm_id is not None:
            query = query.filter(SeasonPartner.farm_id == farm_id)
        if allowed_ids is not None:
            query = query.filter(SeasonPartner.id.in_(allowed_ids))
        return query.all()

    def get_season_partner_by_id(self, db: Session, season_partner_id: int):
        return db.query(SeasonPartner).filter(SeasonPartner.id == season_partner_id).first()

    def update(self, db: Session, season_partner_id: int, season_partner_data: SeasonPartnerRequest):
        existing_partner = db.query(SeasonPartner).filter(SeasonPartner.id == season_partner_id).first()
        if existing_partner is None:
            return None

        existing_partner.season_id = season_partner_data.season_id
        existing_partner.farm_id = season_partner_data.farm_id
        existing_partner.user_id = season_partner_data.user_id
        existing_partner.partner_name = season_partner_data.partner_name
        existing_partner.partnership_percentage = season_partner_data.partnership_percentage
        existing_partner.agreement_date = season_partner_data.agreement_date
        existing_partner.remarks = season_partner_data.remarks

        db.commit()
        db.refresh(existing_partner)
        return existing_partner

    def delete(self, db: Session, season_partner_id: int):
        existing_partner = db.query(SeasonPartner).filter(SeasonPartner.id == season_partner_id).first()
        if existing_partner is None:
            return None

        db.delete(existing_partner)
        db.commit()
        return existing_partner

    def get_farms_by_season( self, db: Session, season_id: int ):
        farm_ids = set()
        seasons_farms = db.query(SeasonPartner.farm_id).filter(SeasonPartner.season_id == season_id).all()
        for (farm_id,) in seasons_farms:
            farm_ids.add(farm_id)
        return farm_ids
        
    def unique_farm_season( self, db: Session, season_id: int, farm_id: int ):
        result = db.query(SeasonPartner.id).filter(SeasonPartner.season_id == season_id).filter(SeasonPartner.farm_id == farm_id).first()
        return result[0] if result else None