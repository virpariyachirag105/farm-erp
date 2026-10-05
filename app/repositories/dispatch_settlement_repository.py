from sqlalchemy.orm import Session

from app.models.dispatch_settlement import DispatchSettlement
from app.schemas.dispatch_settlement import DispatchSettlementRequest

class DispatchSettlementRepository:

    def create(self, db: Session, dispatch_settlement: DispatchSettlement):
        db.add(dispatch_settlement)
        db.commit()
        db.refresh(dispatch_settlement)
        return dispatch_settlement

    def get_dispatch_settlement_list(self, db: Session, dispatch_id):
        return db.query(DispatchSettlement).filter(DispatchSettlement.dispatch_id == dispatch_id).all()

    def get_dispatch_settlement_by_id(self, db: Session, dispatch_settlement_id: int):
        return db.query(DispatchSettlement).filter(DispatchSettlement.id == dispatch_settlement_id).first()

    def update(self, db: Session, dispatch_settlement_id: int, dispatch_settlement_data: DispatchSettlementRequest):
        existing_settlement = db.query(DispatchSettlement).filter(DispatchSettlement.id == dispatch_settlement_id).first()
        if existing_settlement is None:
            return None

        existing_settlement.dispatch_id = dispatch_settlement_data.dispatch_id
        existing_settlement.settlement_date = dispatch_settlement_data.settlement_date
        existing_settlement.loss_amount = dispatch_settlement_data.loss_amount
        existing_settlement.loss_remarks = dispatch_settlement_data.loss_remarks
        existing_settlement.remarks = dispatch_settlement_data.remarks

        db.commit()
        db.refresh(existing_settlement)
        return existing_settlement

    def delete(self, db: Session, dispatch_settlement_id: int):
        existing_settlement = db.query(DispatchSettlement).filter(DispatchSettlement.id == dispatch_settlement_id).first()
        if existing_settlement is None:
            return None

        db.delete(existing_settlement)
        db.commit()
        return existing_settlement
