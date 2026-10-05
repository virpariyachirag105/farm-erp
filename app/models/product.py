from sqlalchemy import Column, String, Text, Boolean

from app.db.database import Base
from app.common.base_model import BaseModel

class Product(Base, BaseModel):
    __tablename__ = "products"

    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)