"""add_ticket_thread_support

Revision ID: d5e6f7a8b9c0
Revises: c3d4e5f6a7b8
Create Date: 2026-05-23

Adds status + last_activity to tickets. Creates ticket_messages table.
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tickets', sa.Column('status', sa.String(30), nullable=True, server_default='ai_responded'))
    op.add_column('tickets', sa.Column('last_activity', sa.DateTime(), nullable=True))
    op.create_table(
        'ticket_messages',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('ticket_id', sa.Integer(), sa.ForeignKey('tickets.id'), nullable=False),
        sa.Column('sender', sa.String(20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('ticket_messages')
    op.drop_column('tickets', 'last_activity')
    op.drop_column('tickets', 'status')
