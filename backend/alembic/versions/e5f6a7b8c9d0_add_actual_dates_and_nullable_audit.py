"""add_actual_dates_and_nullable_audit

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-07 17:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add actual_start and actual_finish to activities table
    with op.batch_alter_table('activities', schema=None) as batch_op:
        batch_op.add_column(sa.Column('actual_start', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('actual_finish', sa.Date(), nullable=True))

    # 2. Make progress_event_id nullable in audit_log
    with op.batch_alter_table('audit_log', schema=None) as batch_op:
        batch_op.alter_column('progress_event_id',
               existing_type=sa.Integer(),
               nullable=True)


def downgrade() -> None:
    with op.batch_alter_table('audit_log', schema=None) as batch_op:
        batch_op.alter_column('progress_event_id',
               existing_type=sa.Integer(),
               nullable=False)

    with op.batch_alter_table('activities', schema=None) as batch_op:
        batch_op.drop_column('actual_finish')
        batch_op.drop_column('actual_start')
