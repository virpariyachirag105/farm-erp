from sqlalchemy import Integer, Column, String, Numeric, Date, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.common.base_model import BaseModel

class Expense(Base, BaseModel):
    __tablename__ = "expenses"

    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=True, index=True)
    expense_date = Column(Date, nullable=True)
    expense_type = Column(String(20), nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Numeric(10,2), nullable=False)
    paid_to = Column(String(100), nullable=False)
    payment_mode = Column(String(100), nullable=True)
    remarks = Column(Text, nullable=True)
    created_by = Column(Integer,ForeignKey("users.id"), index=True, nullable=True)

    season = relationship("Season")
    farm = relationship("Farm")
    creator = relationship("User")