"""add_it_notified_to_clusters

Revision ID: a1b2c3d4e5f6
Revises: e3ed40f74c2a
Create Date: 2026-05-22 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'e3ed40f74c2a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("clusters") as batch_op:
        batch_op.add_column(sa.Column("it_notified", sa.Boolean(), nullable=True, server_default=sa.false()))


def downgrade() -> None:
    with op.batch_alter_table("clusters") as batch_op:
        batch_op.drop_column("it_notified")
