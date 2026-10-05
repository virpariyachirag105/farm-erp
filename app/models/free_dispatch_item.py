from sqlalchemy import Integer, Column, Numeric, Text, Date, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.common.base_model import BaseModel

class FreeDispatchItem(Base, BaseModel):
    __tablename__ = "free_dispatch_items"

    dispatch_id = Column(Integer, ForeignKey("dispatches.id"), nullable=False, index=True)
    dispatch_item_id = Column(Integer, ForeignKey("dispatch_items.id"), nullable=False, index=True)
    distribution_date = Column(Date, nullable=False)
    box_quantity = Column(Numeric(10,2), nullable=False)
    remarks = Column(Text, nullable=True)
    
    dispatch = relationship("Dispatch")
    dispatch_item = relationship("DispatchItem")