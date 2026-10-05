from sqlalchemy import Integer, Column, String, Numeric, Date, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.common.base_model import BaseModel

class Dispatch(Base, BaseModel):
    __tablename__ = "dispatches"

    dispatch_no = Column(String(100), nullable=False, unique=True)
    dispatch_date = Column(Date, nullable=False)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False, index=True)
    dealer_id = Column(Integer, ForeignKey("dealers.id"), nullable=False, index=True)
    vehicle_no = Column(String(20), nullable=True)
    driver_name = Column(String(100), nullable=True)
    transport_name = Column(String(55), nullable=True)
    transport_charge = Column(Numeric(10,2), nullable=True)
    total_boxes = Column(Numeric(10,2), nullable=True)
    total_weight_kg = Column(Numeric(10,2), nullable=True)
    total_amount = Column(Numeric(10,2), nullable=True)
    remarks = Column(Text, nullable=True)
    status = Column(String(20), nullable=True)
    created_by = Column(Integer,ForeignKey("users.id"), index=True, nullable=True)

    dealer = relationship("Dealer")
    creator = relationship("User")
    season = relationship("Season")
    items = relationship("DispatchItem",back_populates="dispatch")