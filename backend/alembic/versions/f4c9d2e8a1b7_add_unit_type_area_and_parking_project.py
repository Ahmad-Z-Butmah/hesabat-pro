"""add unit_type/area to units and project_id to parking_spots

Revision ID: f4c9d2e8a1b7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f4c9d2e8a1b7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # units: unit_type/area nullable أولاً حتى لا تنكسر السجلات القديمة
    unittype = sa.Enum('apartment', 'roof', 'storage', 'studio', name='unittype')
    unittype.create(bind=op.get_bind(), checkfirst=True)
    op.add_column('units', sa.Column('unit_type', unittype, nullable=True))
    op.add_column('units', sa.Column('area', sa.Numeric(10, 2), nullable=True))

    # parking_spots: project_id nullable أولاً
    op.add_column('parking_spots', sa.Column('project_id', sa.Integer(), nullable=True))

    # backfill للسجلات المرتبطة بوحدة من units.project_id
    op.execute(
        """
        UPDATE parking_spots
        SET project_id = units.project_id
        FROM units
        WHERE parking_spots.unit_id = units.id
          AND parking_spots.project_id IS NULL
        """
    )

    # فحص بقايا السجلات بدون project_id
    bind = op.get_bind()
    remaining = bind.execute(
        sa.text("SELECT id FROM parking_spots WHERE project_id IS NULL ORDER BY id")
    ).scalars().all()

    if remaining:
        raise RuntimeError(
            "parking_spots rows still missing project_id after backfill: "
            + ", ".join(str(i) for i in remaining)
        )

    op.alter_column('parking_spots', 'project_id', existing_type=sa.Integer(), nullable=False)
    op.create_index('ix_parking_spots_project_id', 'parking_spots', ['project_id'])
    op.create_foreign_key('parking_spots_project_id_fkey', 'parking_spots', 'projects', ['project_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('parking_spots_project_id_fkey', 'parking_spots', type_='foreignkey')
    op.drop_index('ix_parking_spots_project_id', table_name='parking_spots')
    op.drop_column('parking_spots', 'project_id')
    op.drop_column('units', 'area')
    op.drop_column('units', 'unit_type')
    sa.Enum(name='unittype').drop(bind=op.get_bind(), checkfirst=True)
