from enum import Enum

class FarmType(str, Enum):
    OWN = "OWN"
    MARKET = "MARKET"

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    STAFF = "STAFF"
    PARTNER = "PARTNER"

class DealerType(str, Enum):
    PERCENTAGE = "PERCENTAGE"
    FIXED = "FIXED"
    NONE = "NONE"

class SeasonStatus(str, Enum):
    UPCOMING = "UPCOMING"
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"

class SourceType(str, Enum):
    FARM = "FARM"
    MARKET = "MARKET"

class DispatchStatus(str, Enum):
    PENDING = "PENDING"
    DISPATCHED = "DISPATCHED"
    COMPLETED = "COMPLETED"

class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    PARTIAL = "PARTIAL"
    PAID = "PAID"

class BoxSize(str, Enum):
    FIVE_KG = "5"
    TEN_KG = "10"
    TWENTY_KG = "20"
    DOZEN = "DOZEN"