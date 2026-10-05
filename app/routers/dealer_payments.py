from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.rbac import require_permission
from app.db.session import get_db
from app.models.user import User
from app.schemas.dealer_payment import (
    DealerPaymentRequest,
    DealerPaymentResponse,
)
from app.services.dealer_payment_service import DealerPaymentService

router = APIRouter(prefix="/dealer_payments", tags=["DealerPayments"])

dealer_payment_service = DealerPaymentService()


@router.post("/", response_model=DealerPaymentResponse, dependencies=[Depends(require_permission("dealer_payment.create"))])
def create_dealer_payment(dealer_payment: DealerPaymentRequest, db: Session = Depends(get_db)):
    return dealer_payment_service.create_dealer_payment(db, dealer_payment)


@router.get("/", response_model=list[DealerPaymentResponse])
def get_dealer_payment_list(
    dealer_id: int | None = None,
    season_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dealer_payment.list"))
):
    return dealer_payment_service.get_dealer_payment_list(db, dealer_id, season_id, current_user=current_user)


@router.get("/{dealer_payment_id}", response_model=DealerPaymentResponse)
def get_dealer_payment_detail(
    dealer_payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dealer_payment.view"))
):
    return dealer_payment_service.get_dealer_payment_by_id(db, dealer_payment_id, current_user=current_user)


@router.put("/{dealer_payment_id}", response_model=DealerPaymentResponse, dependencies=[Depends(require_permission("dealer_payment.update"))])
def update_dealer_payment(dealer_payment: DealerPaymentRequest, dealer_payment_id: int, db: Session = Depends(get_db)):
    return dealer_payment_service.update_dealer_payment(db, dealer_payment, dealer_payment_id)


@router.delete("/{dealer_payment_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("dealer_payment.delete"))])
def delete_dealer_payment(dealer_payment_id: int, db: Session = Depends(get_db)):
    dealer_payment_service.delete_dealer_payment(db, dealer_payment_id)
