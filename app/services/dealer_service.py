from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.dealer import Dealer
from app.schemas.dealer import DealerRequest
from app.repositories.dealer_repository import DealerRepository

class DealerService:

    def __init__(self):
        self.dealer_repository = DealerRepository()

    def create_dealer(self, db: Session, dealer_data: DealerRequest):

        existing_dealer = self.dealer_repository.get_by_name(db, dealer_data.name)
        
        if existing_dealer:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Dealer name already exists."
            )

        dealer = Dealer(
            name=dealer_data.name,
            city=dealer_data.city,
            mobile=dealer_data.mobile,
            address=dealer_data.address,
            commission_type=dealer_data.commission_type,
            commission_value=dealer_data.commission_value,
            is_active=dealer_data.is_active
        )

        return self.dealer_repository.create(db, dealer)

    def get_dealer_list(self, db: Session):

        return self.dealer_repository.get_dealer_list(db)

    def get_dealer_by_id(self, db: Session, dealer_id):

        dealer = self.dealer_repository.get_dealer_by_id(db, dealer_id)

        if not dealer:
            raise HTTPException(
                status_code = status.HTTP_404_NOT_FOUND,
                detail = "Dealer not found."
            )

        return dealer

    def update_dealer(self, db: Session, dealer_data: DealerRequest, dealer_id):

        dealer = self.dealer_repository.get_dealer_by_id(db, dealer_id)

        if dealer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dealer not found."
            )

        existing_dealer = self.dealer_repository.get_by_name(
                db,
                dealer_data.name,
                dealer_id
            )

        if existing_dealer:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Dealer name already exists."
            )

        return self.dealer_repository.update(
                db,
                dealer_id,
                dealer_data
            )

    def delete_dealer(self, db: Session, dealer_id):

        dealer = self.dealer_repository.get_dealer_by_id(db, dealer_id)

        if dealer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dealer not found."
            )

        return self.dealer_repository.delete(
                db,
                dealer_id
            )