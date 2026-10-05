from sqlalchemy import Integer, Column, String, Numeric, Date, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.common.base_model import BaseModel

class DealerPayment(Base, BaseModel):
    __tablename__ = "dealer_payments"

    dealer_id = Column(Integer, ForeignKey("dealers.id"), nullable=False, index=True)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=True, index=True)
    payment_date = Column(Date, nullable=True)
    amount = Column(Numeric(10,2), nullable=True)
    payment_mode = Column(String(100), nullable=False)
    reference_no = Column(String(100), nullable=True)
    received_by = Column(String(100), nullable=True)
    remarks = Column(Text, nullable=True)
    created_by = Column(Integer,ForeignKey("users.id"), index=True, nullable=True)

    dealer = relationship("Dealer")
    season = relationship("Season")
    creator = relationship("User")