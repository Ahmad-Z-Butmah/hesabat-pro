"""add customers entity

Revision ID: 7b4c9e2a8f1d
Revises: 93ac8fad3497
Create Date: 2026-08-07 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7b4c9e2a8f1d'
down_revision = '93ac8fad3497'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('customers',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('project_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('phone', sa.String(length=30), nullable=True),
    sa.Column('unit_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
    sa.ForeignKeyConstraint(['unit_id'], ['units.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('unit_id', name='uq_customers_unit_id')
    )
    op.add_column('transactions', sa.Column('customer_id', sa.Integer(), nullable=True))
    op.add_column('transactions', sa.Column('method', sa.String(length=20), nullable=True))
    op.create_index(op.f('ix_transactions_customer_id'), 'transactions', ['customer_id'], unique=False)
    op.create_foreign_key('transactions_customer_id_fkey', 'transactions', 'customers', ['customer_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('transactions_customer_id_fkey', 'transactions', type_='foreignkey')
    op.drop_index(op.f('ix_transactions_customer_id'), table_name='transactions')
    op.drop_column('transactions', 'method')
    op.drop_column('transactions', 'customer_id')
    op.drop_table('customers')
