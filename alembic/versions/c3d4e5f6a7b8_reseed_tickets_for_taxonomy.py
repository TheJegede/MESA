"""reseed_tickets_for_taxonomy

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-05-22 19:10:00.000000

Clears tickets and ticket_tags so seed_tickets_if_empty() re-runs on next
backend start, populating ticket_tags with canonical taxonomy topic strings.
Clusters were already cleared in the previous migration.
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DELETE FROM ticket_tags")
    op.execute("DELETE FROM tickets")


def downgrade() -> None:
    # Seed data is in tickets_seed.json — cannot restore here
    pass
