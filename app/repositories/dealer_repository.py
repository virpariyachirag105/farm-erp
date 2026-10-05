from sqlalchemy.orm import Session

from app.models.dealer import Dealer
from app.schemas.dealer import DealerRequest

class DealerRepository:

    def create(self, db: Session, dealer:Dealer):
        db.add(dealer)
        db.commit()
        db.refresh(dealer)
        return dealer

    def get_by_name(self, db: Session, name: str, dealer_id: int = None):

        dealer_query = db.query(Dealer)
        if dealer_id is not None:
            dealer_query = dealer_query.filter(Dealer.id != dealer_id)
        
        dealer_query = dealer_query.filter(Dealer.name == name).first()
        return dealer_query

    def get_dealer_list(self, db: Session):
        return db.query(Dealer).order_by(Dealer.name.asc()).all()

    def get_dealer_by_id(self, db: Session, dealer_id):
        return db.query(Dealer).filter(Dealer.id == dealer_id).first()

    def update(self, db: Session, dealer_id: int, dealer_data: DealerRequest):
        existing_dealer = ( db.query(Dealer).filter(Dealer.id == dealer_id).first())
        if existing_dealer is None:
            return None

        existing_dealer.name = dealer_data.name
        existing_dealer.city = dealer_data.city
        existing_dealer.mobile = dealer_data.mobile
        existing_dealer.address = dealer_data.address
        existing_dealer.commission_type = dealer_data.commission_type
        existing_dealer.commission_value = dealer_data.commission_value
        existing_dealer.is_active = dealer_data.is_active

        db.commit()
        db.refresh(existing_dealer)

        return existing_dealer

    def delete(self, db: Session, dealer_id: int):
        existing_dealer = ( db.query(Dealer).filter(Dealer.id == dealer_id).first())
        if existing_dealer is None:
            return None

        existing_dealer.is_active = False

        db.commit()
        db.refresh(existing_dealer)

        return existing_dealer