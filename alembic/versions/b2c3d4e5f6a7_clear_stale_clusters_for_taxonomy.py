"""clear_stale_clusters_for_taxonomy

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-22 19:00:00.000000

Truncates clusters table so stale free-text topic strings are removed.
Clusters are fully derived data — pattern_detector rebuilds them from
ticket_tags on next backend start using the new canonical taxonomy.
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DELETE FROM clusters")


def downgrade() -> None:
    # Clusters are derived data — cannot restore deleted rows
    pass
