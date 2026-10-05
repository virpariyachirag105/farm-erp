from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.rbac import require_permission
from app.db.session import get_db
from app.models.user import User
from app.schemas.season_box_cost import (
    SeasonBoxCostRequest,
    SeasonBoxCostResponse,
)
from app.services.season_box_cost_service import SeasonBoxCostService

router = APIRouter(prefix="/season_box_costs", tags=["SeasonBoxCosts"])

season_box_cost_service = SeasonBoxCostService()


@router.post("/", response_model=SeasonBoxCostResponse, dependencies=[Depends(require_permission("season_box_cost.create"))])
def create_season_box_cost(season_box_cost: SeasonBoxCostRequest, db: Session = Depends(get_db)):
    return season_box_cost_service.create_season_box_cost(db, season_box_cost)


@router.get("/", response_model=list[SeasonBoxCostResponse])
def get_season_box_cost_list(
    season_id: int | None = None,
    farm_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("season_box_cost.list"))
):
    return season_box_cost_service.get_season_box_cost_list(db, season_id, farm_id, current_user=current_user)


@router.get("/{season_box_cost_id}", response_model=SeasonBoxCostResponse)
def get_season_box_cost_detail(
    season_box_cost_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("season_box_cost.view"))
):
    return season_box_cost_service.get_season_box_cost_by_id(db, season_box_cost_id, current_user=current_user)


@router.put("/{season_box_cost_id}", response_model=SeasonBoxCostResponse, dependencies=[Depends(require_permission("season_box_cost.update"))])
def update_season_box_cost(season_box_cost: SeasonBoxCostRequest, season_box_cost_id: int, db: Session = Depends(get_db)):
    return season_box_cost_service.update_season_box_cost(db, season_box_cost, season_box_cost_id)


@router.delete("/{season_box_cost_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("season_box_cost.delete"))])
def delete_season_box_cost(season_box_cost_id: int, db: Session = Depends(get_db)):
    season_box_cost_service.delete_season_box_cost(db, season_box_cost_id)
