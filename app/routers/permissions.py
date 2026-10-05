from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.rbac import require_permission
from app.db.session import get_db
from app.schemas.permission import ModulePermissionsResponse, PermissionResponse
from app.services.permission_service import PermissionService

router = APIRouter(
    prefix="/permissions",
    tags=["Permissions"]
)

permission_service = PermissionService()


@router.get("/", response_model=list[PermissionResponse], dependencies=[Depends(require_permission("permission.list"))])
def get_all_permissions(db: Session = Depends(get_db)):
    return permission_service.get_all_permissions(db)


@router.get("/by-module", response_model=list[ModulePermissionsResponse], dependencies=[Depends(require_permission("permission.list"))])
def get_permissions_by_module(db: Session = Depends(get_db)):
    return permission_service.get_permissions_grouped_by_module(db)


@router.get("/{permission_id}", response_model=PermissionResponse, dependencies=[Depends(require_permission("permission.view"))])
def get_permission_detail(permission_id: int, db: Session = Depends(get_db)):
    return permission_service.get_permission_by_id(db, permission_id)
