from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.permission import Permission
from app.repositories.permission_repository import PermissionRepository
from app.schemas.permission import ModulePermissionsResponse, PermissionResponse


class PermissionService:

    def __init__(self):
        self.permission_repository = PermissionRepository()

    def get_all_permissions(self, db: Session) -> list[PermissionResponse]:
        permissions = self.permission_repository.get_all(db)
        return [PermissionResponse.model_validate(p) for p in permissions]

    def get_permissions_grouped_by_module(self, db: Session) -> list[ModulePermissionsResponse]:
        permissions = self.permission_repository.get_all(db)
        grouped: dict[str, list[PermissionResponse]] = {}
        for p in permissions:
            if p.module not in grouped:
                grouped[p.module] = []
            grouped[p.module].append(PermissionResponse.model_validate(p))

        return [
            ModulePermissionsResponse(module=module, permissions=perms)
            for module, perms in grouped.items()
        ]

    def get_permission_by_id(self, db: Session, permission_id: int) -> PermissionResponse:
        permission = self.permission_repository.get_by_id(db, permission_id)
        if not permission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Permission not found."
            )
        return PermissionResponse.model_validate(permission)
