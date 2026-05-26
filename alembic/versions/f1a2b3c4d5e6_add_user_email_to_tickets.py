"""add_user_email_to_tickets

Revision ID: f1a2b3c4d5e6
Revises: b687544ab72d
Create Date: 2026-05-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'b687544ab72d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('tickets', schema=None) as batch_op:
        batch_op.add_column(sa.Column('user_email', sa.String(length=200), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('tickets', schema=None) as batch_op:
        batch_op.drop_column('user_email')
