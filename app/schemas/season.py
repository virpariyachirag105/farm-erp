from datetime import date
from pydantic import BaseModel
from app.common.enum import SeasonStatus


class SeasonRequest(BaseModel):
    name: str
    start_date: date | None = None
    end_date: date | None = None
    status: SeasonStatus

class SeasonResponse(BaseModel):
    id: int
    name: str
    start_date: date | None = None
    end_date: date | None = None
    status: SeasonStatus

    class Config:
        from_attributes = True