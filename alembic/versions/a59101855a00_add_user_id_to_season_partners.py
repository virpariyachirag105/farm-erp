"""add_user_id_to_season_partners

Revision ID: a59101855a00
Revises: 70201e899d5a
Create Date: 2026-09-28 16:42:10.907134

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a59101855a00'
down_revision: Union[str, Sequence[str], None] = '70201e899d5a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('season_partners', sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
    op.create_index('ix_season_partners_user_id', 'season_partners', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_season_partners_user_id', table_name='season_partners')
    op.drop_column('season_partners', 'user_id')
