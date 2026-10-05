from sqlalchemy import Boolean, Column, String, Numeric

from app.db.database import Base
from app.common.base_model import BaseModel

class Dealer(Base, BaseModel):
    __tablename__ = "dealers"

    name = Column(String(100), nullable=False, unique=True)
    city = Column(String(100), nullable=True)
    mobile = Column(String(100), nullable=True)
    address = Column(String(255), nullable=True)
    commission_type = Column(String(20), nullable=False)
    commission_value = Column(Numeric(10,2), default=10.00)
    is_active = Column(Boolean, default=True)