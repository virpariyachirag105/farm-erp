from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.rbac import require_permission
from app.db.session import get_db
from app.schemas.dealer import DealerRequest, DealerResponse
from app.services.dealer_service import DealerService

router = APIRouter(prefix="/dealers", tags=["Dealers"])

dealer_service = DealerService()


@router.post("/", response_model=DealerResponse, dependencies=[Depends(require_permission("dealer.create"))])
def create_dealer(dealer: DealerRequest, db: Session = Depends(get_db)):
    return dealer_service.create_dealer(db, dealer)


@router.get("/", response_model=list[DealerResponse], dependencies=[Depends(require_permission("dealer.list"))])
def get_dealer_list(db: Session = Depends(get_db)):
    return dealer_service.get_dealer_list(db)


@router.get("/{dealer_id}", response_model=DealerResponse, dependencies=[Depends(require_permission("dealer.view"))])
def get_dealer_detail(dealer_id: int, db: Session = Depends(get_db)):
    return dealer_service.get_dealer_by_id(db, dealer_id)


@router.put("/{dealer_id}", response_model=DealerResponse, dependencies=[Depends(require_permission("dealer.update"))])
def update_dealer(dealer: DealerRequest, dealer_id: int, db: Session = Depends(get_db)):
    return dealer_service.update_dealer(db, dealer, dealer_id)


@router.delete("/{dealer_id}", response_model=DealerResponse, dependencies=[Depends(require_permission("dealer.delete"))])
def delete_dealer(dealer_id: int, db: Session = Depends(get_db)):
    return dealer_service.delete_dealer(db, dealer_id)