from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.common.base_model import BaseModel
from app.common.enum import UserRole


class User(Base, BaseModel):
    __tablename__ = "users"

    name = Column(String(100), nullable=False, index=True)
    email = Column(String(100), nullable=False, unique=True, index=True)
    password = Column(String(255), nullable=False)
    mobile = Column(String(20), nullable=True)
    image = Column(String(255), nullable=True)
    role = Column(String(20), nullable=True, default=UserRole.STAFF.value)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False, nullable=False)

    role_rel = relationship("Role", back_populates="users", lazy="joined")

