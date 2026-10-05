from sqlalchemy import Column, String, ForeignKey, Table, Integer
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.common.base_model import BaseModel

# Association table for Many-to-Many relationship between Roles and Permissions
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)
