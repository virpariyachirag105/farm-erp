from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.common.base_model import BaseModel
from app.models.role_permission import role_permissions


class Permission(Base, BaseModel):
    __tablename__ = "permissions"

    name = Column(String(100), nullable=False, unique=True, index=True)
    module = Column(String(50), nullable=False, index=True)
    action = Column(String(50), nullable=False)
    description = Column(String(255), nullable=True)

    roles = relationship(
        "Role",
        secondary=role_permissions,
        back_populates="permissions"
    )
