from sqlalchemy import Boolean, Column, String
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.common.base_model import BaseModel
from app.models.role_permission import role_permissions


class Role(Base, BaseModel):
    __tablename__ = "roles"

    name = Column(String(50), nullable=False, unique=True, index=True)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    users = relationship("User", back_populates="role_rel")
    permissions = relationship(
        "Permission",
        secondary=role_permissions,
        back_populates="roles",
        lazy="joined"
    )
