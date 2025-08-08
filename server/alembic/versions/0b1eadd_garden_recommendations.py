"""add garden_recommendations table

Revision ID: 0b1eadd_garden_recommendations
Revises: 91f5c74ba012
Create Date: 2025-08-08 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0b1eadd_garden_recommendations"
down_revision = "91f5c74ba012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "garden_recommendations",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "garden_id", sa.Integer(), sa.ForeignKey("gardens.id"), nullable=False
        ),
        sa.Column("data", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_unique_constraint(
        "uq_garden_recommendations_garden_id",
        "garden_recommendations",
        ["garden_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_garden_recommendations_garden_id",
        "garden_recommendations",
        type_="unique",
    )
    op.drop_table("garden_recommendations")
