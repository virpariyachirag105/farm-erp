from sqlalchemy.orm import Session, joinedload

from app.models.partner_settlement import PartnerSettlement
from app.schemas.partner_settlement import PartnerSettlementRequest
from app.models.season_partner import SeasonPartner

class PartnerSettlementRepository:

    def create(self, db: Session, partner_settlement: PartnerSettlement):
        db.add(partner_settlement)
        db.commit()
        db.refresh(partner_settlement)
        return partner_settlement

    def get_partner_settlement_list(self, db: Session, season_id=None, farm_id=None, allowed_sp_ids: list[int] | None = None):
        query = db.query(PartnerSettlement).options(
                joinedload(PartnerSettlement.season_partner).joinedload(SeasonPartner.season),
                joinedload(PartnerSettlement.season_partner).joinedload(SeasonPartner.farm)
            )

        if season_id:
            query = query.filter(
                PartnerSettlement.season_partner.has(
                    SeasonPartner.season_id == season_id
                )
            )

        if farm_id:
            query = query.filter(
                PartnerSettlement.season_partner.has(
                    SeasonPartner.farm_id == farm_id
                )
            )

        if allowed_sp_ids is not None:
            query = query.filter(
                PartnerSettlement.season_partner_id.in_(allowed_sp_ids)
            )

        return query.all()

    def get_partner_settlement_by_id(self, db: Session, partner_settlement_id: int):
        return db.query(PartnerSettlement).filter(PartnerSettlement.id == partner_settlement_id).first()

    def update(self, db: Session, partner_settlement_id: int, partner_settlement_data: PartnerSettlementRequest):
        existing_settlement = db.query(PartnerSettlement).filter(PartnerSettlement.id == partner_settlement_id).first()
        if existing_settlement is None:
            return None

        net_profit = (partner_settlement_data.total_sales - partner_settlement_data.total_expenses)
        partner_amount = (net_profit* partner_settlement_data.partner_percentage/ 100)

        existing_settlement.season_partner_id = partner_settlement_data.season_partner_id
        existing_settlement.settlement_date = partner_settlement_data.settlement_date
        existing_settlement.total_sales = partner_settlement_data.total_sales
        existing_settlement.total_expenses = partner_settlement_data.total_expenses
        existing_settlement.net_profit = net_profit
        existing_settlement.partner_percentage = partner_settlement_data.partner_percentage
        existing_settlement.partner_amount = partner_amount
        existing_settlement.amount_paid = partner_settlement_data.amount_paid
        existing_settlement.payment_date = partner_settlement_data.payment_date
        existing_settlement.payment_mode = partner_settlement_data.payment_mode
        existing_settlement.reference_no = partner_settlement_data.reference_no
        existing_settlement.remarks = partner_settlement_data.remarks
        existing_settlement.image = partner_settlement_data.image
        existing_settlement.created_by = partner_settlement_data.created_by

        db.commit()
        db.refresh(existing_settlement)
        return existing_settlement

    def delete(self, db: Session, partner_settlement_id: int):
        existing_settlement = db.query(PartnerSettlement).filter(PartnerSettlement.id == partner_settlement_id).first()
        if existing_settlement is None:
            return None

        db.delete(existing_settlement)
        db.commit()
        return existing_settlement
