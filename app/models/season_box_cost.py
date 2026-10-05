from sqlalchemy import Integer, Column, String, Numeric, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.common.base_model import BaseModel

class SeasonBoxCost(Base, BaseModel):
    __tablename__ = "season_box_costs"

    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=True, index=True)
    box_size_kg = Column(String(20), nullable=True)
    total_boxes = Column(Numeric(10,2), nullable=False)
    price_per_box = Column(Numeric(10,2), nullable=False)
    total_amount = Column(Numeric(10,2), nullable=False)
    remarks = Column(Text, nullable=True)
    created_by = Column(Integer,ForeignKey("users.id"), index=True, nullable=True)

    season = relationship("Season")
    farm = relationship("Farm")
    creator = relationship("User")