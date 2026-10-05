from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile, status

from app.core.rbac import get_partner_scope
from app.models.partner_settlement import PartnerSettlement
from app.models.user import User
from app.schemas.partner_settlement import PartnerSettlementRequest
from app.repositories.partner_settlement_repository import PartnerSettlementRepository
from app.repositories.season_partner_repository import SeasonPartnerRepository
from app.common.file_storage import save_settlement_image, delete_file_if_exists

class PartnerSettlementService:

    def __init__(self):
        self.partner_settlement_repository = PartnerSettlementRepository()
        self.season_partner_repository = SeasonPartnerRepository()

    def _validate_season_partner(self, db: Session, season_partner_id: int):
        season_partner = self.season_partner_repository.get_season_partner_by_id(db, season_partner_id)
        if season_partner is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Season partner not found."
            )

    def upload_settlement_image(self, file: UploadFile) -> str:
        return save_settlement_image(file)

    def create_partner_settlement(self, db: Session, partner_settlement_data: PartnerSettlementRequest):

        self._validate_season_partner(db, partner_settlement_data.season_partner_id)
        net_profit = (partner_settlement_data.total_sales - partner_settlement_data.total_expenses)
        partner_amount = (net_profit* partner_settlement_data.partner_percentage/ 100)

        partner_settlement = PartnerSettlement(
            season_partner_id=partner_settlement_data.season_partner_id,
            settlement_date=partner_settlement_data.settlement_date,
            total_sales=partner_settlement_data.total_sales,
            total_expenses=partner_settlement_data.total_expenses,
            net_profit=net_profit,
            partner_percentage=partner_settlement_data.partner_percentage,
            partner_amount=partner_amount,
            amount_paid=partner_settlement_data.amount_paid,
            payment_date=partner_settlement_data.payment_date,
            payment_mode=partner_settlement_data.payment_mode,
            reference_no=partner_settlement_data.reference_no,
            remarks=partner_settlement_data.remarks,
            image=partner_settlement_data.image,
            created_by=partner_settlement_data.created_by
        )

        return self.partner_settlement_repository.create(db, partner_settlement)

    def get_partner_settlement_list(self, db: Session, season_id: int | None = None, farm_id: int | None = None, current_user: User | None = None):
        allowed_sp_ids = None
        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                allowed_sp_ids = scope["season_partner_ids"]

        return self.partner_settlement_repository.get_partner_settlement_list(
            db, season_id=season_id, farm_id=farm_id, allowed_sp_ids=allowed_sp_ids
        )

    def get_partner_settlement_by_id(self, db: Session, partner_settlement_id: int, current_user: User | None = None):

        partner_settlement = self.partner_settlement_repository.get_partner_settlement_by_id(db, partner_settlement_id)

        if partner_settlement is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Partner settlement not found."
            )

        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                if partner_settlement.season_partner_id not in scope["season_partner_ids"]:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied to this partner settlement."
                    )

        return partner_settlement

    def update_partner_settlement(self, db: Session, partner_settlement_data: PartnerSettlementRequest, partner_settlement_id: int):

        partner_settlement = self.partner_settlement_repository.get_partner_settlement_by_id(db, partner_settlement_id)

        if partner_settlement is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Partner settlement not found."
            )

        self._validate_season_partner(db, partner_settlement_data.season_partner_id)

        if partner_settlement.image and partner_settlement.image != partner_settlement_data.image:
            delete_file_if_exists(partner_settlement.image)

        return self.partner_settlement_repository.update(db, partner_settlement_id, partner_settlement_data)

    def delete_partner_settlement(self, db: Session, partner_settlement_id: int):

        partner_settlement = self.partner_settlement_repository.get_partner_settlement_by_id(db, partner_settlement_id)

        if partner_settlement is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Partner settlement not found."
            )

        if partner_settlement.image:
            delete_file_if_exists(partner_settlement.image)

        return self.partner_settlement_repository.delete(db, partner_settlement_id)
