"""add_is_verified_to_users

Revision ID: 7537d7394a08
Revises: 41ebda8c5cf7
Create Date: 2026-09-26 21:12:08.529349

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7537d7394a08'
down_revision: Union[str, Sequence[str], None] = '41ebda8c5cf7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'users',
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.false())
    )
    # Set existing active users as verified
    op.execute("UPDATE users SET is_verified = TRUE WHERE is_active = TRUE")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'is_verified')

