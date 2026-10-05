from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.core.rbac import require_permission
from app.db.session import get_db
from app.models.user import User
from app.schemas.partner_settlement import (
    PartnerSettlementRequest,
    PartnerSettlementResponse,
    SettlementImageUploadResponse,
)
from app.services.partner_settlement_service import PartnerSettlementService

router = APIRouter(prefix="/partner_settlements", tags=["PartnerSettlements"])

partner_settlement_service = PartnerSettlementService()


@router.post("/upload-image", response_model=SettlementImageUploadResponse, dependencies=[Depends(require_permission("partner_settlement.upload_image"))])
def upload_settlement_image(file: UploadFile = File(...)):
    image_url = partner_settlement_service.upload_settlement_image(file)
    return {"image_url": image_url}


@router.post("/", response_model=PartnerSettlementResponse, dependencies=[Depends(require_permission("partner_settlement.create"))])
def create_partner_settlement(partner_settlement: PartnerSettlementRequest, db: Session = Depends(get_db)):
    return partner_settlement_service.create_partner_settlement(db, partner_settlement)


@router.get("/", response_model=list[PartnerSettlementResponse])
def get_partner_settlement_list(
    season_id: int | None = None,
    farm_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("partner_settlement.list"))
):
    return partner_settlement_service.get_partner_settlement_list(db, season_id, farm_id, current_user=current_user)


@router.get("/{partner_settlement_id}", response_model=PartnerSettlementResponse)
def get_partner_settlement_detail(
    partner_settlement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("partner_settlement.view"))
):
    return partner_settlement_service.get_partner_settlement_by_id(db, partner_settlement_id, current_user=current_user)


@router.put("/{partner_settlement_id}", response_model=PartnerSettlementResponse, dependencies=[Depends(require_permission("partner_settlement.update"))])
def update_partner_settlement(partner_settlement: PartnerSettlementRequest, partner_settlement_id: int, db: Session = Depends(get_db)):
    return partner_settlement_service.update_partner_settlement(db, partner_settlement, partner_settlement_id)


@router.delete("/{partner_settlement_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("partner_settlement.delete"))])
def delete_partner_settlement(partner_settlement_id: int, db: Session = Depends(get_db)):
    partner_settlement_service.delete_partner_settlement(db, partner_settlement_id)
