from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.rbac import require_permission
from app.db.session import get_db
from app.schemas.dispatch_settlement import (
    DispatchSettlementRequest,
    DispatchSettlementResponse,
)
from app.services.dispatch_settlement_service import DispatchSettlementService

router = APIRouter(prefix="/dispatch_settlements", tags=["DispatchSettlements"])

dispatch_settlement_service = DispatchSettlementService()


@router.post("/", response_model=DispatchSettlementResponse, dependencies=[Depends(require_permission("dispatch_settlement.create"))])
def create_dispatch_settlement(dispatch_settlement: DispatchSettlementRequest, db: Session = Depends(get_db)):
    return dispatch_settlement_service.create_dispatch_settlement(db, dispatch_settlement)


@router.get("/list/{dispatch_id}", response_model=list[DispatchSettlementResponse], dependencies=[Depends(require_permission("dispatch_settlement.list"))])
def get_dispatch_settlement_list(dispatch_id: int, db: Session = Depends(get_db)):
    return dispatch_settlement_service.get_dispatch_settlement_list(db, dispatch_id)


@router.get("/{dispatch_settlement_id}", response_model=DispatchSettlementResponse, dependencies=[Depends(require_permission("dispatch_settlement.view"))])
def get_dispatch_settlement_detail(dispatch_settlement_id: int, db: Session = Depends(get_db)):
    return dispatch_settlement_service.get_dispatch_settlement_by_id(db, dispatch_settlement_id)


@router.put("/{dispatch_settlement_id}", response_model=DispatchSettlementResponse, dependencies=[Depends(require_permission("dispatch_settlement.update"))])
def update_dispatch_settlement(dispatch_settlement: DispatchSettlementRequest, dispatch_settlement_id: int, db: Session = Depends(get_db)):
    return dispatch_settlement_service.update_dispatch_settlement(db, dispatch_settlement, dispatch_settlement_id)


@router.delete("/{dispatch_settlement_id}", response_model=DispatchSettlementResponse, dependencies=[Depends(require_permission("dispatch_settlement.delete"))])
def delete_dispatch_settlement(dispatch_settlement_id: int, db: Session = Depends(get_db)):
    return dispatch_settlement_service.delete_dispatch_settlement(db, dispatch_settlement_id)
