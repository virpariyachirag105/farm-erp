from sqlalchemy import Boolean, Column, String

from app.db.database import Base
from app.common.base_model import BaseModel

class Farm(Base, BaseModel):
    __tablename__ = "farms"

    name = Column(String(100), nullable=False, unique=True)
    location = Column(String(255), nullable=True)
    owner_name = Column(String(100), nullable=False)
    farm_type = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True)