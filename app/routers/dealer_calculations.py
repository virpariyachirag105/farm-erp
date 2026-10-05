from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.rbac import require_permission
from app.db.session import get_db
from app.services.dealer_calculation_service import DealerCalculationService

from app.models.user import User

router = APIRouter(
    prefix="/dealer_calculations",
    tags=["DealerCalculations"]
)

dealer_calculation_service = DealerCalculationService()


@router.get("/season/{season_id}/summary")
def get_season_dealer_summary(
    season_id: int,
    farm_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dealer_calculation.view"))
):
    """
    Returns a summary list of all dealers for a season with aggregated calculations.
    Optional farm_id filter to show only dispatches involving a specific farm.
    """
    return dealer_calculation_service.get_season_dealer_summary(db, season_id, farm_id, current_user=current_user)


@router.get("/season/{season_id}/dealer/{dealer_id}/dispatches")
def get_dealer_dispatches(
    season_id: int,
    dealer_id: int,
    farm_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dealer_calculation.view"))
):
    """
    Returns all dispatches for a dealer in a season with per-dispatch calculations.
    """
    return dealer_calculation_service.get_dealer_dispatches(db, season_id, dealer_id, farm_id, current_user=current_user)


@router.get("/season/{season_id}/farm/{farm_id}/dispatches")
def get_season_farm_dispatches(
    season_id: int,
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dealer_calculation.view"))
):
    """
    Returns all dispatches for a season and farm with calculations.
    """
    return dealer_calculation_service.get_season_farm_dispatches(db, season_id, farm_id, current_user=current_user)


@router.get("/dispatch/{dispatch_id}")
def get_dispatch_calculation(
    dispatch_id: int,
    farm_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dealer_calculation.view"))
):
    """
    Returns full item-level calculation breakdown for a single dispatch.
    Optional farm_id to filter calculation for a specific farm.
    """
    result = dealer_calculation_service.get_dispatch_calculation(db, dispatch_id, farm_id, current_user=current_user)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispatch not found.")
    return result
