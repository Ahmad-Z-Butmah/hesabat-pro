"""add transaction sequence number

Revision ID: a1b2c3d4e5f6
Revises: c158f0b2f327
Create Date: 2026-08-06 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'c158f0b2f327'
branch_labels = None
depends_on = None

SEQUENCE_NAME = 'transactions_sequence_number_seq'


def upgrade() -> None:
    op.execute(f"CREATE SEQUENCE {SEQUENCE_NAME}")

    op.add_column('transactions', sa.Column('sequence_number', sa.Integer(), nullable=True))

    # Backfill existing rows ascending by created_at, then id
    op.execute(
        f"""
        WITH numbered AS (
            SELECT id,
                   row_number() OVER (ORDER BY created_at ASC, id ASC) AS rn
            FROM transactions
        )
        UPDATE transactions t
        SET sequence_number = numbered.rn
        FROM numbered
        WHERE t.id = numbered.id
        """
    )

    # Continue the sequence from the last assigned number
    op.execute(
        f"SELECT setval('{SEQUENCE_NAME}', "
        f"COALESCE((SELECT MAX(sequence_number) FROM transactions), 0))"
    )

    op.alter_column(
        'transactions',
        'sequence_number',
        existing_type=sa.Integer(),
        nullable=False,
        server_default=sa.text(f"nextval('{SEQUENCE_NAME}')"),
    )
    op.create_unique_constraint('uq_transactions_sequence_number', 'transactions', ['sequence_number'])


def downgrade() -> None:
    op.drop_constraint('uq_transactions_sequence_number', 'transactions', type_='unique')
    op.drop_column('transactions', 'sequence_number')
    op.execute(f"DROP SEQUENCE {SEQUENCE_NAME}")
