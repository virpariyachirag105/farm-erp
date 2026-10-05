from pydantic import BaseModel, Field

from app.schemas.permission import PermissionResponse


class RoleRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    description: str | None = None
    is_active: bool = True
    permission_ids: list[int] = Field(default_factory=list)


class RoleResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    is_active: bool

    class Config:
        from_attributes = True


class RoleDetailResponse(RoleResponse):
    permissions: list[PermissionResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class AssignPermissionsRequest(BaseModel):
    permission_ids: list[int] = Field(default_factory=list)
