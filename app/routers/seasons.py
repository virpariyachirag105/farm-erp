from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.rbac import require_permission
from app.db.session import get_db
from app.models.user import User
from app.schemas.season import SeasonRequest, SeasonResponse
from app.services.season_service import SeasonService

router = APIRouter(prefix="/seasons", tags=["Seasons"])

season_service = SeasonService()


@router.post("/", response_model=SeasonResponse, dependencies=[Depends(require_permission("season.create"))])
def create_season(season: SeasonRequest, db: Session = Depends(get_db)):
    return season_service.create_season(db, season)


@router.get("/", response_model=list[SeasonResponse])
def get_season_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("season.list"))
):
    return season_service.get_season_list(db, current_user=current_user)


@router.get("/{season_id}", response_model=SeasonResponse)
def get_season_detail(
    season_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("season.view"))
):
    return season_service.get_season_by_id(db, season_id, current_user=current_user)


@router.put("/{season_id}", response_model=SeasonResponse, dependencies=[Depends(require_permission("season.update"))])
def update_season(season: SeasonRequest, season_id: int, db: Session = Depends(get_db)):
    return season_service.update_season(db, season, season_id)


@router.delete("/{season_id}", response_model=SeasonResponse, dependencies=[Depends(require_permission("season.delete"))])
def delete_season(season_id: int, db: Session = Depends(get_db)):
    return season_service.delete_season(db, season_id)