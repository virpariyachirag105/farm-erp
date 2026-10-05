from sqlalchemy import Integer, Column, Numeric, Text, Date, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.common.base_model import BaseModel

class DispatchSettlement(Base, BaseModel):
    __tablename__ = "dispatch_settlements"

    dispatch_id = Column(Integer, ForeignKey("dispatches.id"), nullable=False, index=True)
    settlement_date = Column(Date, nullable=False)
    loss_amount = Column(Numeric(10,2), nullable=False)
    loss_remarks = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)

    dispatch = relationship("Dispatch")