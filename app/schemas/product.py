from pydantic import BaseModel


class ProductRequest(BaseModel):
    name: str
    description: str | None = None
    is_active: bool = True

class ProductResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    is_active: bool = True

    class Config:
        from_attributes = True