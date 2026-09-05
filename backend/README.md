# Hesabat — الباك إند

باك إند مبني بـ FastAPI + PostgreSQL (عبر SQLAlchemy وAlembic للـ migrations).

## البنية

```
backend/
├── app/
│   ├── main.py              # نقطة تشغيل التطبيق
│   ├── core/                # الإعدادات (config) والأمان (JWT, hashing)
│   ├── db/                  # اتصال قاعدة البيانات + قاعدة الموديلات
│   ├── models/               # نماذج SQLAlchemy (الجداول)
│   ├── schemas/               # نماذج Pydantic (طلبات/استجابات الـ API)
│   └── api/
│       ├── deps.py           # اعتماديات مشتركة (get_current_user...)
│       ├── router.py         # تجميع كل الراوترات
│       └── routes/           # auth, projects, units, parking, parties, transactions
├── alembic/                  # ملفات الهجرات (migrations)
├── alembic.ini
├── requirements.txt
└── .env.example
```

## الجداول الحالية

- **users** — المستخدمون (تسجيل دخول)
- **projects** — المشاريع (عقاري/مطعم/مقهى...)
- **units** — الشقق/الوحدات التابعة لكل مشروع (متاحة/محجوزة/مباعة)
- **parking_spots** — مواقف السيارات التابعة للشقق
- **parties** — الأطراف: عملاء (وارد) ومقاولون/موردون (صادر)
- **transactions** — الحركات المالية: شيك/كاش، وارد/صادر، بحالتها (مستحق/تم الصرف/مرتجع)

## التشغيل محلياً

### 1) تجهيز قاعدة بيانات PostgreSQL

**خيار أ — عبر Docker (لا حاجة لتثبيت PostgreSQL يدوياً):**

```bash
docker compose up -d
```

**خيار ب — إذا كان PostgreSQL مثبتاً لديك:**

أنشئ قاعدة بيانات فارغة (مثال بالاسم `hesabat_db`) باستخدام pgAdmin أو الأمر:

```bash
createdb hesabat_db
```

### 2) بيئة بايثون والاعتماديات

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # على ويندوز (PowerShell: .venv\Scripts\Activate.ps1)
pip install -r requirements.txt
```

### 3) ملف الإعدادات

انسخ `.env.example` إلى `.env` وعدّل `DATABASE_URL` ليطابق بيانات قاعدتك:

```bash
copy .env.example .env
```

### 4) تشغيل الهجرات (إنشاء الجداول)

```bash
alembic revision --autogenerate -m "initial tables"
alembic upgrade head
```

### 5) تشغيل السيرفر

```bash
uvicorn app.main:app --reload
```

السيرفر يعمل على `http://127.0.0.1:8000`، والتوثيق التفاعلي على `http://127.0.0.1:8000/docs`.

## المصادقة

- `POST /api/v1/auth/register` — تسجيل مستخدم جديد
- `POST /api/v1/auth/login` — تسجيل الدخول (يرجع `access_token`)
- أرسل التوكن في باقي الطلبات عبر الهيدر: `Authorization: Bearer <token>`
