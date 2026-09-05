"""إنشاء مستخدم المدير الافتراضي إن لم يكن موجوداً (يُستدعى عند إقلاع التطبيق)."""

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User

DEFAULT_ADMIN_USERNAME = "ADMIN"
DEFAULT_ADMIN_PASSWORD = "12345"


def seed_admin_user() -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == DEFAULT_ADMIN_USERNAME).first()
        if existing:
            return

        admin = User(
            username=DEFAULT_ADMIN_USERNAME,
            email="admin@hesabat.local",
            full_name="مدير النظام",
            hashed_password=hash_password(DEFAULT_ADMIN_PASSWORD),
        )
        db.add(admin)
        db.commit()
    finally:
        db.close()
