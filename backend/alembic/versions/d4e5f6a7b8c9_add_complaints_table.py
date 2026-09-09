"""add_complaints_table

Revision ID: d4e5f6a7b8c9
Revises: c1f4e5a91b2c
Create Date: 2026-09-07 03:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c1f4e5a91b2c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'complaints',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('activity_id', sa.Integer(), nullable=True),
        sa.Column('supervisor_id', sa.Integer(), nullable=False),
        sa.Column(
            'category',
            sa.Enum(
                'material_delay',
                'equipment_breakdown',
                'manpower_shortage',
                'access_blocked',
                'safety_concern',
                'weather',
                'other',
                name='complaint_category_enum',
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column('description', sa.String(length=2000), nullable=False),
        sa.Column(
            'status',
            sa.Enum(
                'open',
                'acknowledged',
                'resolved',
                name='complaint_status_enum',
                native_enum=False,
            ),
            nullable=False,
            server_default='open',
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['supervisor_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resolved_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_complaints_id'), 'complaints', ['id'], unique=False)
    op.create_index(op.f('ix_complaints_project_id'), 'complaints', ['project_id'], unique=False)
    op.create_index(op.f('ix_complaints_activity_id'), 'complaints', ['activity_id'], unique=False)
    op.create_index(op.f('ix_complaints_supervisor_id'), 'complaints', ['supervisor_id'], unique=False)
    op.create_index(op.f('ix_complaints_status'), 'complaints', ['status'], unique=False)
    op.create_index(op.f('ix_complaints_category'), 'complaints', ['category'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_complaints_category'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_status'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_supervisor_id'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_activity_id'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_project_id'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_id'), table_name='complaints')
    op.drop_table('complaints')
