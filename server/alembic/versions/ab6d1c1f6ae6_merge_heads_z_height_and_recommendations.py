"""merge heads: z_height and recommendations

Revision ID: ab6d1c1f6ae6
Revises: 1fe4ef7d3499, a1b2c3d4e5f6
Create Date: 2025-08-07 23:39:33.598114

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ab6d1c1f6ae6'
down_revision: Union[str, None] = ('1fe4ef7d3499', 'a1b2c3d4e5f6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
