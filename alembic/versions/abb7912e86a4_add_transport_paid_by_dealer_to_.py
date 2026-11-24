"""add_transport_paid_by_dealer_to_dispatches

Revision ID: abb7912e86a4
Revises: da97aeb43017
Create Date: 2026-11-24 11:24:57.753936

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'abb7912e86a4'
down_revision: Union[str, Sequence[str], None] = 'da97aeb43017'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'dispatches',
        sa.Column('transport_paid_by_dealer', sa.Boolean(), nullable=False, server_default=sa.false())
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('dispatches', 'transport_paid_by_dealer')

