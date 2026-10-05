from sqlalchemy import Column, String, Date

from app.db.database import Base
from app.common.base_model import BaseModel

class Season(Base, BaseModel):
    __tablename__ = "seasons"

    name = Column(String(50), nullable=False, unique=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    status = Column(String(20), nullable=False)