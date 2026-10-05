from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.rbac import get_partner_scope
from app.models.dealer_payment import DealerPayment
from app.models.user import User
from app.schemas.dealer_payment import DealerPaymentRequest
from app.repositories.dealer_payment_repository import DealerPaymentRepository
from app.repositories.dealer_repository import DealerRepository
from app.repositories.season_repository import SeasonRepository

class DealerPaymentService:

    def __init__(self):
        self.dealer_payment_repository = DealerPaymentRepository()
        self.dealer_repository = DealerRepository()
        self.season_repository = SeasonRepository()

    def _validate_dealer(self, db: Session, dealer_id: int):
        dealer = self.dealer_repository.get_dealer_by_id(db, dealer_id)
        if dealer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dealer not found."
            )

    def _validate_season(self, db: Session, season_id: int | None):
        if season_id is not None and season_id > 0:
            season = self.season_repository.get_season_by_id(db, season_id)
            if season is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Season not found."
                )

    def create_dealer_payment(self, db: Session, dealer_payment_data: DealerPaymentRequest):

        self._validate_dealer(db, dealer_payment_data.dealer_id)
        self._validate_season(db, dealer_payment_data.season_id)

        dealer_payment = DealerPayment(
            dealer_id=dealer_payment_data.dealer_id,
            season_id=dealer_payment_data.season_id if (dealer_payment_data.season_id and dealer_payment_data.season_id > 0) else None,
            payment_date=dealer_payment_data.payment_date,
            amount=dealer_payment_data.amount,
            payment_mode=dealer_payment_data.payment_mode,
            reference_no=dealer_payment_data.reference_no,
            received_by=dealer_payment_data.received_by,
            remarks=dealer_payment_data.remarks,
            created_by=dealer_payment_data.created_by
        )

        return self.dealer_payment_repository.create(db, dealer_payment)

    def get_dealer_payment_list(self, db: Session, dealer_id: int | None = None, season_id: int | None = None, current_user: User | None = None):

        if dealer_id:
            dealer = self.dealer_repository.get_dealer_by_id(db, dealer_id)
            if not dealer:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Dealer not found."
                )

        allowed_season_ids = None
        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                allowed_season_ids = scope["season_ids"]

        return self.dealer_payment_repository.get_dealer_payment_list(db, dealer_id, season_id, allowed_season_ids=allowed_season_ids)

    def get_dealer_payment_by_id(self, db: Session, dealer_payment_id: int, current_user: User | None = None):

        dealer_payment = self.dealer_payment_repository.get_dealer_payment_by_id(db, dealer_payment_id)

        if not dealer_payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dealer payment not found."
            )

        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                if dealer_payment.season_id not in scope["season_ids"]:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied to this dealer payment."
                    )

        return dealer_payment

    def update_dealer_payment(self, db: Session, dealer_payment_data: DealerPaymentRequest, dealer_payment_id: int):

        dealer_payment = self.dealer_payment_repository.get_dealer_payment_by_id(db, dealer_payment_id)

        if dealer_payment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dealer payment not found."
            )

        self._validate_dealer(db, dealer_payment_data.dealer_id)
        self._validate_season(db, dealer_payment_data.season_id)

        # Normalize season_id <= 0 to None
        if dealer_payment_data.season_id is not None and dealer_payment_data.season_id <= 0:
            dealer_payment_data.season_id = None

        return self.dealer_payment_repository.update(db, dealer_payment_id, dealer_payment_data)

    def delete_dealer_payment(self, db: Session, dealer_payment_id: int):

        dealer_payment = self.dealer_payment_repository.get_dealer_payment_by_id(db, dealer_payment_id)

        if dealer_payment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dealer payment not found."
            )

        return self.dealer_payment_repository.delete(db, dealer_payment_id)
