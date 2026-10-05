from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.rbac import require_permission
from app.db.session import get_db
from app.models.user import User
from app.schemas.farm import FarmRequest, FarmResponse
from app.services.farm_service import FarmService

router = APIRouter(prefix="/farms", tags=["Farms"])

farm_service = FarmService()


@router.post("/", response_model=FarmResponse, dependencies=[Depends(require_permission("farm.create"))])
def create_farm(farm: FarmRequest, db: Session = Depends(get_db)):
    return farm_service.create_farm(db, farm)


@router.get("/", response_model=list[FarmResponse])
def get_farm_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("farm.list"))
):
    return farm_service.get_farm_list(db, current_user=current_user)


@router.get("/{farm_id}", response_model=FarmResponse)
def get_farm_detail(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("farm.view"))
):
    return farm_service.get_farm_by_id(db, farm_id, current_user=current_user)


@router.put("/{farm_id}", response_model=FarmResponse, dependencies=[Depends(require_permission("farm.update"))])
def update_farm(farm: FarmRequest, farm_id: int, db: Session = Depends(get_db)):
    return farm_service.update_farm(db, farm, farm_id)


@router.delete("/{farm_id}", response_model=FarmResponse, dependencies=[Depends(require_permission("farm.delete"))])
def delete_farm(farm_id: int, db: Session = Depends(get_db)):
    return farm_service.delete_farm(db, farm_id)