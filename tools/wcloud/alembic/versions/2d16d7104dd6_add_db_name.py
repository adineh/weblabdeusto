"""Add db_name

Revision ID: 2d16d7104dd6
Revises: 41daf2bf458b
Create Date: 2015-02-09 15:25:22.452554

"""

# revision identifiers, used by Alembic.
revision = '2d16d7104dd6'
down_revision = '41daf2bf458b'

from alembic import op
import sqlalchemy as sa


def upgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.add_column('entities', sa.Column('db_name', sa.Unicode(length=200), nullable=True))
    ### end Alembic commands ###


def downgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('entities', 'db_name')
    ### end Alembic commands ###