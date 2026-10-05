from sqlalchemy import Integer, Column, String, Numeric, Date, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.common.base_model import BaseModel

class PartnerSettlement(Base, BaseModel):
    __tablename__ = "partner_settlements"

    season_partner_id = Column(Integer, ForeignKey("season_partners.id"), nullable=False, index=True)
    settlement_date = Column(Date, nullable=True)
    total_sales = Column(Numeric(10,2), nullable=True)
    total_expenses = Column(Numeric(10,2), nullable=True)
    net_profit = Column(Numeric(10,2), nullable=True)
    partner_percentage = Column(Numeric(10,2), nullable=True)
    partner_amount = Column(Numeric(10,2), nullable=True)
    amount_paid = Column(Numeric(10,2), nullable=True)
    payment_date = Column(Date, nullable=True)
    payment_mode = Column(String(100), nullable=True)
    reference_no = Column(String(100), nullable=True)
    remarks = Column(Text, nullable=True)
    image = Column(String(255), nullable=True)
    created_by = Column(Integer,ForeignKey("users.id"), index=True, nullable=True)

    season_partner = relationship("SeasonPartner")
    creator = relationship("User")