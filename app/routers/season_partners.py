from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.rbac import require_permission
from app.db.session import get_db
from app.models.user import User
from app.schemas.season_partner import SeasonPartnerRequest, SeasonPartnerResponse
from app.services.season_partner_service import SeasonPartnerService

router = APIRouter(prefix="/season_partners", tags=["SeasonPartners"])

season_partner_service = SeasonPartnerService()


@router.post("/", response_model=SeasonPartnerResponse, dependencies=[Depends(require_permission("season_partner.create"))])
def create_season_partner(season_partner: SeasonPartnerRequest, db: Session = Depends(get_db)):
    return season_partner_service.create_season_partner(db, season_partner)


@router.get("/", response_model=list[SeasonPartnerResponse])
def get_season_partner_list(
    season_id: int | None = None,
    farm_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("season_partner.list"))
):
    return season_partner_service.get_season_partner_list(db, season_id=season_id, farm_id=farm_id, current_user=current_user)


@router.get("/{season_partner_id}", response_model=SeasonPartnerResponse)
def get_season_partner_detail(
    season_partner_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("season_partner.view"))
):
    return season_partner_service.get_season_partner_by_id(db, season_partner_id, current_user=current_user)


@router.put("/{season_partner_id}", response_model=SeasonPartnerResponse, dependencies=[Depends(require_permission("season_partner.update"))])
def update_season_partner(season_partner: SeasonPartnerRequest, season_partner_id: int, db: Session = Depends(get_db)):
    return season_partner_service.update_season_partner(db, season_partner, season_partner_id)


@router.delete("/{season_partner_id}", response_model=SeasonPartnerResponse, dependencies=[Depends(require_permission("season_partner.delete"))])
def delete_season_partner(season_partner_id: int, db: Session = Depends(get_db)):
    return season_partner_service.delete_season_partner(db, season_partner_id)
