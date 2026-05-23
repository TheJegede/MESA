"""add_dict_eligible_to_clusters

Revision ID: e3ed40f74c2a
Revises: 
Create Date: 2026-05-22 18:14:21.784096

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3ed40f74c2a'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("clusters") as batch_op:
        batch_op.add_column(sa.Column("dict_eligible", sa.Boolean(), nullable=True, server_default=sa.false()))


def downgrade() -> None:
    with op.batch_alter_table("clusters") as batch_op:
        batch_op.drop_column("dict_eligible")
