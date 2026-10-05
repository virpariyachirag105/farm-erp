from datetime import datetime
from sqlalchemy import Column, Integer, DateTime

class BaseModel:

    id = Column(Integer, primary_key=True, index=True)

    created_at = Column(DateTime, default=datetime.now, nullable=False)

    updated_at = Column(
        DateTime,
        default=datetime.now,
        onupdate=datetime.now,
        nullable=False
    )