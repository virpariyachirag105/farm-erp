from sqlalchemy import Column, Integer, String, Numeric, Date, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.common.base_model import BaseModel

class SeasonPartner(Base, BaseModel):
    __tablename__ = "season_partners"

    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    partner_name = Column(String(100), nullable=True)
    partnership_percentage = Column(Numeric(10,2), default=10.00)
    agreement_date = Column(Date, nullable=True)
    remarks = Column(Text, nullable=False)

    season = relationship("Season")
    farm = relationship("Farm")
    user = relationship("User")
    