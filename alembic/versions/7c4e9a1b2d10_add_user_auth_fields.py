"""Add user auth fields

Revision ID: 7c4e9a1b2d10
Revises: b9f702cdc53e
Create Date: 2026-08-27 16:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c4e9a1b2d10'
down_revision: Union[str, Sequence[str], None] = 'b9f702cdc53e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('mobile', sa.String(length=20), nullable=True))
    op.add_column('users', sa.Column('image', sa.String(length=255), nullable=True))
    op.add_column(
        'users',
        sa.Column('role', sa.String(length=20), nullable=False, server_default='STAFF')
    )
    op.add_column(
        'users',
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default=sa.true())
    )
    op.alter_column(
        'users',
        'password',
        existing_type=sa.String(length=100),
        type_=sa.String(length=255),
        existing_nullable=True
    )
    op.drop_index(op.f('ix_users_password'), table_name='users')
    op.execute("UPDATE users SET name = 'User' WHERE name IS NULL")
    op.execute("UPDATE users SET email = CONCAT('user', id, '@farm-erp.local') WHERE email IS NULL")
    op.execute("UPDATE users SET password = '' WHERE password IS NULL")
    op.alter_column('users', 'name', existing_type=sa.String(length=100), nullable=False)
    op.alter_column('users', 'email', existing_type=sa.String(length=100), nullable=False)
    op.alter_column('users', 'password', existing_type=sa.String(length=255), nullable=False)
    op.alter_column('users', 'role', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('users', 'password', existing_type=sa.String(length=255), nullable=True)
    op.alter_column('users', 'email', existing_type=sa.String(length=100), nullable=True)
    op.alter_column('users', 'name', existing_type=sa.String(length=100), nullable=True)
    op.create_index(op.f('ix_users_password'), 'users', ['password'], unique=False)
    op.alter_column(
        'users',
        'password',
        existing_type=sa.String(length=255),
        type_=sa.String(length=100),
        existing_nullable=True
    )
    op.drop_column('users', 'is_active')
    op.drop_column('users', 'role')
    op.drop_column('users', 'image')
    op.drop_column('users', 'mobile')
