from sqlalchemy import Integer, Column, String, Numeric, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.common.base_model import BaseModel

class DispatchItem(Base, BaseModel):
    __tablename__ = "dispatch_items"

    dispatch_id = Column(Integer, ForeignKey("dispatches.id"), nullable=False, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    source_type = Column(String(20), nullable=False)
    variety = Column(String(20), nullable=True)
    grade = Column(String(20), nullable=True)
    box_size_kg = Column(String(20), nullable=True)
    box_quantity = Column(Numeric(10,2), nullable=False)
    price_per_box = Column(Numeric(10,2), nullable=False)
    total_weight_kg = Column(Numeric(10,2), nullable=False)
    total_amount = Column(Numeric(10,2), nullable=False)
    remarks = Column(Text, nullable=True)

    farm = relationship("Farm")
    product = relationship("Product")
    dispatch = relationship("Dispatch",back_populates="items")