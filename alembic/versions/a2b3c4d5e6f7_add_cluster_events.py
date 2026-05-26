"""add_cluster_events

Revision ID: a2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-05-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, Sequence[str], None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)

    # Add total_count to clusters if not already present
    existing_cols = [c['name'] for c in inspector.get_columns('clusters')]
    if 'total_count' not in existing_cols:
        op.execute('ALTER TABLE clusters ADD COLUMN total_count INTEGER')

    # Create cluster_events table only if it doesn't exist yet
    if 'cluster_events' not in inspector.get_table_names():
        op.create_table(
            'cluster_events',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('cluster_id', sa.Integer(), sa.ForeignKey('clusters.id'), nullable=False),
            sa.Column('event_type', sa.String(length=20), nullable=False),
            sa.Column('ticket_count', sa.Integer(), nullable=True),
            sa.Column('cumulative_count', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)

    if 'cluster_events' in inspector.get_table_names():
        op.drop_table('cluster_events')

    existing_cols = [c['name'] for c in inspector.get_columns('clusters')]
    if 'total_count' in existing_cols:
        with op.batch_alter_table('clusters', schema=None) as batch_op:
            batch_op.drop_column('total_count')
