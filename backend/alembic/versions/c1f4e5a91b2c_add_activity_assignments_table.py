"""add_activity_assignments_table

Revision ID: c1f4e5a91b2c
Revises: 9f52d3f74271
Create Date: 2026-09-07 03:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1f4e5a91b2c'
down_revision: Union[str, Sequence[str], None] = '9f52d3f74271'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create activity_assignments table
    op.create_table(
        'activity_assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('activity_id', sa.Integer(), nullable=False),
        sa.Column('supervisor_id', sa.Integer(), nullable=False),
        sa.Column('project_week', sa.Integer(), nullable=False),
        sa.Column('planned_duration_days', sa.Float(), nullable=False),
        sa.Column('assignment_source', sa.Enum('auto', 'manual', name='assignment_source_enum', native_enum=False), nullable=False),
        sa.Column('assigned_by', sa.Integer(), nullable=True),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('previous_supervisor_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['supervisor_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['previous_supervisor_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('activity_id')
    )
    op.create_index(op.f('ix_activity_assignments_id'), 'activity_assignments', ['id'], unique=False)
    op.create_index(op.f('ix_activity_assignments_activity_id'), 'activity_assignments', ['activity_id'], unique=True)
    op.create_index(op.f('ix_activity_assignments_supervisor_id'), 'activity_assignments', ['supervisor_id'], unique=False)
    op.create_index(op.f('ix_activity_assignments_project_week'), 'activity_assignments', ['project_week'], unique=False)

    # 2. Create activity_assignment_history table
    op.create_table(
        'activity_assignment_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('activity_id', sa.Integer(), nullable=False),
        sa.Column('supervisor_id', sa.Integer(), nullable=False),
        sa.Column('previous_supervisor_id', sa.Integer(), nullable=True),
        sa.Column('assignment_source', sa.Enum('auto', 'manual', name='assignment_source_enum', native_enum=False), nullable=False),
        sa.Column('assigned_by', sa.Integer(), nullable=True),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('reason', sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['supervisor_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['previous_supervisor_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_activity_assignment_history_id'), 'activity_assignment_history', ['id'], unique=False)
    op.create_index(op.f('ix_activity_assignment_history_activity_id'), 'activity_assignment_history', ['activity_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_activity_assignment_history_activity_id'), table_name='activity_assignment_history')
    op.drop_index(op.f('ix_activity_assignment_history_id'), table_name='activity_assignment_history')
    op.drop_table('activity_assignment_history')

    op.drop_index(op.f('ix_activity_assignments_project_week'), table_name='activity_assignments')
    op.drop_index(op.f('ix_activity_assignments_supervisor_id'), table_name='activity_assignments')
    op.drop_index(op.f('ix_activity_assignments_activity_id'), table_name='activity_assignments')
    op.drop_index(op.f('ix_activity_assignments_id'), table_name='activity_assignments')
    op.drop_table('activity_assignments')
