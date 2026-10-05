from sqlalchemy.orm import Session

from app.models.dealer_payment import DealerPayment
from app.schemas.dealer_payment import DealerPaymentRequest

class DealerPaymentRepository:

    def create(self, db: Session, dealer_payment: DealerPayment):
        db.add(dealer_payment)
        db.commit()
        db.refresh(dealer_payment)
        return dealer_payment

    def get_dealer_payment_list(self, db: Session, dealer_id: int | None = None, season_id: int | None = None, allowed_season_ids: list[int] | None = None):
        query = db.query(DealerPayment)
        
        if dealer_id is not None:
            query = query.filter(DealerPayment.dealer_id == dealer_id)
            
        if season_id is not None:
            if season_id == -1: # unassigned filter if needed
                query = query.filter(DealerPayment.season_id.is_(None))
            elif season_id > 0:
                query = query.filter(DealerPayment.season_id == season_id)

        if allowed_season_ids is not None:
            query = query.filter(DealerPayment.season_id.in_(allowed_season_ids))

        query = query.order_by(DealerPayment.payment_date.desc()).all()
        return query

    def get_dealer_payment_by_id(self, db: Session, dealer_payment_id: int):
        return db.query(DealerPayment).filter(DealerPayment.id == dealer_payment_id).first()

    def update(self, db: Session, dealer_payment_id: int, dealer_payment_data: DealerPaymentRequest):
        existing_payment = db.query(DealerPayment).filter(DealerPayment.id == dealer_payment_id).first()
        if existing_payment is None:
            return None

        existing_payment.dealer_id = dealer_payment_data.dealer_id
        existing_payment.season_id = dealer_payment_data.season_id
        existing_payment.payment_date = dealer_payment_data.payment_date
        existing_payment.amount = dealer_payment_data.amount
        existing_payment.payment_mode = dealer_payment_data.payment_mode
        existing_payment.reference_no = dealer_payment_data.reference_no
        existing_payment.received_by = dealer_payment_data.received_by
        existing_payment.remarks = dealer_payment_data.remarks
        existing_payment.created_by = dealer_payment_data.created_by

        db.commit()
        db.refresh(existing_payment)
        return existing_payment

    def delete(self, db: Session, dealer_payment_id: int):
        existing_payment = db.query(DealerPayment).filter(DealerPayment.id == dealer_payment_id).first()
        if existing_payment is None:
            return None

        db.delete(existing_payment)
        db.commit()
        return existing_payment
