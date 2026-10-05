from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.dispatch_settlement import DispatchSettlement
from app.schemas.dispatch_settlement import DispatchSettlementRequest
from app.repositories.dispatch_settlement_repository import DispatchSettlementRepository
from app.repositories.dispatch_repository import DispatchRepository

class DispatchSettlementService:

    def __init__(self):
        self.dispatch_settlement_repository = DispatchSettlementRepository()
        self.dispatch_repository = DispatchRepository()

    def _validate_dispatch(self, db: Session, dispatch_id: int):
        dispatch = self.dispatch_repository.get_dispatch_by_id(db, dispatch_id)
        if dispatch is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispatch not found."
            )

    def create_dispatch_settlement(self, db: Session, dispatch_settlement_data: DispatchSettlementRequest):

        self._validate_dispatch(db, dispatch_settlement_data.dispatch_id)

        dispatch_settlement = DispatchSettlement(
            dispatch_id=dispatch_settlement_data.dispatch_id,
            settlement_date=dispatch_settlement_data.settlement_date,
            loss_amount=dispatch_settlement_data.loss_amount,
            loss_remarks=dispatch_settlement_data.loss_remarks,
            remarks=dispatch_settlement_data.remarks
        )

        return self.dispatch_settlement_repository.create(db, dispatch_settlement)

    def get_dispatch_settlement_list(self, db: Session, dispatch_id):
        return self.dispatch_settlement_repository.get_dispatch_settlement_list(db, dispatch_id)

    def get_dispatch_settlement_by_id(self, db: Session, dispatch_settlement_id: int):
        dispatch_settlement = self.dispatch_settlement_repository.get_dispatch_settlement_by_id(db, dispatch_settlement_id)

        if not dispatch_settlement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispatch settlement not found."
            )

        return dispatch_settlement

    def update_dispatch_settlement(self, db: Session, dispatch_settlement_data: DispatchSettlementRequest, dispatch_settlement_id: int):

        dispatch_settlement = self.dispatch_settlement_repository.get_dispatch_settlement_by_id(db, dispatch_settlement_id)

        if dispatch_settlement is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispatch settlement not found."
            )

        self._validate_dispatch(db, dispatch_settlement_data.dispatch_id)

        return self.dispatch_settlement_repository.update(db, dispatch_settlement_id, dispatch_settlement_data)

    def delete_dispatch_settlement(self, db: Session, dispatch_settlement_id: int):

        dispatch_settlement = self.dispatch_settlement_repository.get_dispatch_settlement_by_id(db, dispatch_settlement_id)

        if dispatch_settlement is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispatch settlement not found."
            )

        return self.dispatch_settlement_repository.delete(db, dispatch_settlement_id)
