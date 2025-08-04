"""Fix garden schema - drop and recreate tables

Revision ID: 767df6e8c2a2
Revises: f5d02822f6e6
Create Date: 2025-08-03 19:25:44.488711

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '767df6e8c2a2'
down_revision: Union[str, None] = 'f5d02822f6e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop existing tables if they exist
    op.execute("DROP TABLE IF EXISTS garden_elements CASCADE;")
    op.execute("DROP TABLE IF EXISTS gardens CASCADE;")
    
    # Create gardens table
    op.create_table('gardens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('zip_code', sa.String(length=5), nullable=False),
        sa.Column('user_id', sa.String(length=255), nullable=False),
        sa.Column('view_box_x', sa.Float(), nullable=True),
        sa.Column('view_box_y', sa.Float(), nullable=True),
        sa.Column('view_box_width', sa.Float(), nullable=True),
        sa.Column('view_box_height', sa.Float(), nullable=True),
        sa.Column('zoom', sa.Float(), nullable=True),
        sa.Column('grid_size', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_gardens_id'), 'gardens', ['id'], unique=False)
    op.create_index(op.f('ix_gardens_user_id'), 'gardens', ['user_id'], unique=False)
    
    # Create garden_elements table
    op.create_table('garden_elements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('element_id', sa.String(length=255), nullable=False),
        sa.Column('garden_id', sa.Integer(), nullable=False),
        sa.Column('element_type', sa.String(length=50), nullable=False),
        sa.Column('position_x', sa.Float(), nullable=False),
        sa.Column('position_y', sa.Float(), nullable=False),
        sa.Column('width', sa.Float(), nullable=True),
        sa.Column('height', sa.Float(), nullable=True),
        sa.Column('label', sa.String(length=255), nullable=True),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('common_name', sa.String(length=255), nullable=True),
        sa.Column('botanical_name', sa.String(length=255), nullable=True),
        sa.Column('plant_type', sa.String(length=100), nullable=True),
        sa.Column('sunlight_needs', sa.String(length=255), nullable=True),
        sa.Column('water_needs', sa.String(length=255), nullable=True),
        sa.Column('mature_size', sa.String(length=255), nullable=True),
        sa.Column('spacing', sa.Float(), nullable=True),
        sa.Column('show_spacing', sa.Boolean(), nullable=True),
        sa.Column('text_content', sa.Text(), nullable=True),
        sa.Column('font_size', sa.Integer(), nullable=True),
        sa.Column('text_color', sa.String(length=7), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['garden_id'], ['gardens.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_garden_elements_id'), 'garden_elements', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_garden_elements_id'), table_name='garden_elements')
    op.drop_table('garden_elements')
    op.drop_index(op.f('ix_gardens_user_id'), table_name='gardens')
    op.drop_index(op.f('ix_gardens_id'), table_name='gardens')
    op.drop_table('gardens')
