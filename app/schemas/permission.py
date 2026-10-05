from pydantic import BaseModel


class PermissionBase(BaseModel):
    name: str
    module: str
    action: str
    description: str | None = None


class PermissionCreate(PermissionBase):
    pass


class PermissionResponse(PermissionBase):
    id: int

    class Config:
        from_attributes = True


class ModulePermissionsResponse(BaseModel):
    module: str
    permissions: list[PermissionResponse]
