from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.rbac import require_permission
from app.db.session import get_db
from app.schemas.role import (
    AssignPermissionsRequest,
    RoleDetailResponse,
    RoleRequest,
    RoleResponse,
)
from app.services.role_service import RoleService

router = APIRouter(
    prefix="/roles",
    tags=["Roles"]
)

role_service = RoleService()


@router.post("/", response_model=RoleDetailResponse, dependencies=[Depends(require_permission("role.create"))])
def create_role(role: RoleRequest, db: Session = Depends(get_db)):
    return role_service.create_role(db, role)


@router.get("/", response_model=list[RoleResponse], dependencies=[Depends(require_permission("role.list"))])
def get_role_list(db: Session = Depends(get_db)):
    return role_service.get_role_list(db)


@router.get("/{role_id}", response_model=RoleDetailResponse, dependencies=[Depends(require_permission("role.view"))])
def get_role_detail(role_id: int, db: Session = Depends(get_db)):
    return role_service.get_role_by_id(db, role_id)


@router.put("/{role_id}", response_model=RoleDetailResponse, dependencies=[Depends(require_permission("role.update"))])
def update_role(role_id: int, role: RoleRequest, db: Session = Depends(get_db)):
    return role_service.update_role(db, role_id, role)


@router.put("/{role_id}/permissions", response_model=RoleDetailResponse, dependencies=[Depends(require_permission("role.assign_permissions"))])
def assign_permissions(role_id: int, assign_data: AssignPermissionsRequest, db: Session = Depends(get_db)):
    return role_service.assign_permissions(db, role_id, assign_data)


@router.delete("/{role_id}", dependencies=[Depends(require_permission("role.delete"))])
def delete_role(role_id: int, db: Session = Depends(get_db)):
    return role_service.delete_role(db, role_id)
