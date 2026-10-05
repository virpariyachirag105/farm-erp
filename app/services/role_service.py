from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.role import Role
from app.repositories.permission_repository import PermissionRepository
from app.repositories.role_repository import RoleRepository
from app.schemas.role import (
    AssignPermissionsRequest,
    RoleDetailResponse,
    RoleRequest,
    RoleResponse,
)


class RoleService:

    def __init__(self):
        self.role_repository = RoleRepository()
        self.permission_repository = PermissionRepository()

    def create_role(self, db: Session, role_data: RoleRequest) -> RoleDetailResponse:
        existing = self.role_repository.get_by_name(db, role_data.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Role with name '{role_data.name}' already exists."
            )

        permissions = []
        if role_data.permission_ids:
            permissions = self.permission_repository.get_by_ids(db, role_data.permission_ids)
            if len(permissions) != len(role_data.permission_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="One or more permission IDs are invalid."
                )

        role = Role(
            name=role_data.name,
            description=role_data.description,
            is_active=role_data.is_active
        )
        created_role = self.role_repository.create(db, role, permissions)
        return RoleDetailResponse.model_validate(created_role)

    def get_role_list(self, db: Session) -> list[RoleResponse]:
        roles = self.role_repository.get_all(db)
        return [RoleResponse.model_validate(r) for r in roles]

    def get_role_by_id(self, db: Session, role_id: int) -> RoleDetailResponse:
        role = self.role_repository.get_by_id(db, role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found."
            )
        return RoleDetailResponse.model_validate(role)

    def update_role(self, db: Session, role_id: int, role_data: RoleRequest) -> RoleDetailResponse:
        role = self.role_repository.get_by_id(db, role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found."
            )

        existing = self.role_repository.get_by_name(db, role_data.name, exclude_id=role_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Role with name '{role_data.name}' already exists."
            )

        permissions = None
        if role_data.permission_ids is not None:
            permissions = self.permission_repository.get_by_ids(db, role_data.permission_ids)
            if len(permissions) != len(role_data.permission_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="One or more permission IDs are invalid."
                )

        updated_role = self.role_repository.update(db, role, role_data, permissions)
        return RoleDetailResponse.model_validate(updated_role)

    def assign_permissions(
        self,
        db: Session,
        role_id: int,
        assign_data: AssignPermissionsRequest
    ) -> RoleDetailResponse:
        role = self.role_repository.get_by_id(db, role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found."
            )

        permissions = self.permission_repository.get_by_ids(db, assign_data.permission_ids)
        if len(permissions) != len(assign_data.permission_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more permission IDs are invalid."
            )

        updated_role = self.role_repository.assign_permissions(db, role, permissions)
        return RoleDetailResponse.model_validate(updated_role)

    def delete_role(self, db: Session, role_id: int):
        role = self.role_repository.get_by_id(db, role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found."
            )

        if role.name.upper() == "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete default Admin role."
            )

        if role.users:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete role that is assigned to active users. Reassign users first."
            )

        self.role_repository.delete(db, role)
        return {"detail": "Role deleted successfully."}
