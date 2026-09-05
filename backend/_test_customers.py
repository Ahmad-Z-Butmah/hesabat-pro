"""End-to-end verification of the customers page logic.

Run:  .venv\\Scripts\\python.exe _test_customers.py
    (workdir = src/BackEnd)

Verifies:
  1. Selling a unit to a new buyer makes them appear as a customer (derived from UnitSale).
  2. Recording a payment updates paid/remaining.
  3. Selling a SECOND unit to the SAME buyer keeps ONE customer with multiple units (no duplication).
  4. A buyer in another project does not appear in this project's customers (isolation).
  5. Customer detail exposes units + sale info + plan + totals.
  6. Only incoming transactions are allowed on a customer.
  7. Removing a sale removes that unit from the customer (derived, no stale link).
  8. Buyers stay excluded from the parties page (unchanged behavior).
"""
import asyncio
import io
from datetime import date

import app.db.base  # noqa: F401  (register all models before relationships resolve)
from app.db.session import SessionLocal
from app.models.parking import ParkingSpot
from app.models.party import Party
from app.models.project import Project
from app.models.sale_attachment import SaleAttachment
from app.models.transaction import Transaction, TransactionType
from app.models.unit import Unit, UnitStatus, UnitType
from app.models.unit_sale import UnitSale
from app.models.user import User

from app.api.routes.customers import (
    create_customer_transaction,
    get_customer,
    list_customer_transactions,
    list_customers,
)
from app.api.routes.parties import list_parties_summary
from app.api.routes.unit_sales import create_unit_sale
from app.schemas.unit_sale import UnitSaleCreate
from starlette.datastructures import UploadFile as StarletteUploadFile

PROJECT_NAME = "__test_customers_e2e__"
BUYER_A_NAME = "سامر الحاج"
BUYER_A_PHONE = "0590000111"
BUYER_B_NAME = "عميل مشروع آخر"


def make_user(db):
    user = db.query(User).first()
    if not user:
        raise RuntimeError("No user registered")
    return user


def make_project(db, user, name, unit_nos):
    project = Project(name=name, owner_id=user.id, type="عقارات")
    db.add(project)
    db.flush()
    units = []
    for no in unit_nos:
        u = Unit(project_id=project.id, no=no, floor=1, status=UnitStatus.available, unit_type=UnitType.apartment)
        db.add(u)
        units.append(u)
    db.flush()
    for i in range(1, len(unit_nos) + 1):
        db.add(ParkingSpot(project_id=project.id, code=f"موقف {i}", is_visitor=False))
    db.flush()
    return project, units


def clean(db):
    ids = [p.id for p in db.query(Project).filter(Project.name.like(f"{PROJECT_NAME}%")).all()]
    if not ids:
        return
    from app.models.transaction_attachment import TransactionAttachment
    from app.models.unit_sale import UnitSale as US
    from app.models.sale_attachment import SaleAttachment as SA

    tx_ids = [t.id for t in db.query(Transaction).filter(Transaction.project_id.in_(ids)).all()]
    if tx_ids:
        db.query(TransactionAttachment).filter(TransactionAttachment.transaction_id.in_(tx_ids)).delete()
        db.query(Transaction).filter(Transaction.id.in_(tx_ids)).delete()
    sale_ids = [s.id for s in db.query(US).filter(US.project_id.in_(ids)).all()]
    if sale_ids:
        db.query(SA).filter(SA.sale_id.in_(sale_ids)).delete()
        db.query(US).filter(US.id.in_(sale_ids)).delete()
    db.query(ParkingSpot).filter(ParkingSpot.project_id.in_(ids)).delete()
    db.query(Party).filter(Party.project_id.in_(ids)).delete()
    db.query(Unit).filter(Unit.project_id.in_(ids)).delete()
    db.query(Project).filter(Project.id.in_(ids)).delete()
    db.commit()


def make_contract():
    return StarletteUploadFile(
        filename="contract::contract.pdf",
        file=io.BytesIO(b"%PDF-1.4 test"),
        headers={"content-type": "application/pdf"},
    )


async def main():
    db = SessionLocal()
    try:
        user = make_user(db)
        clean(db)
        db.commit()

        project_a, units_a = make_project(db, user, PROJECT_NAME, ["101", "102"])
        project_b, units_b = make_project(db, user, f"{PROJECT_NAME}_B", ["201"])
        db.commit()
        unit_101, unit_102 = units_a
        unit_201 = units_b[0]

        # 1) بيع شقة 101 لمشتري جديد
        sale1 = await create_unit_sale(
            project_a.id,
            payload=UnitSaleCreate(
                unit_id=unit_101.id,
                buyer_name=BUYER_A_NAME,
                buyer_phone=BUYER_A_PHONE,
                sale_price=100000,
                down_payment=10000,
                sale_date=date.today(),
                cheques=[],
            ).model_dump_json(),
            files=[make_contract()],
            db=db,
            current_user=user,
        )
        rows = list_customers(project_a.id, db, user)
        assert any(c.name == BUYER_A_NAME for c in rows), "buyer must appear in customers after sale"
        cust = next(c for c in rows if c.name == BUYER_A_NAME)
        assert [u.unit_no for u in cust.units] == ["101"], cust.units
        assert float(cust.sale_price_total) == 100000.0
        assert float(cust.paid_total) == 10000.0, cust.paid_total  # دفعة أولى
        assert float(cust.remaining_total) == 90000.0, cust.remaining_total
        print(f"1) sale -> customer appears: {cust.name} units={[u.unit_no for u in cust.units]} paid={cust.paid_total} remaining={cust.remaining_total}")

        # 2) سجل دفعة → يتحدث المدفوع والمتبقي
        await create_customer_transaction(
            project_a.id, cust.id,
            type="cash_in", amount="5000", transaction_date=str(date.today()),
            method="cash", note="دفعة", due_date=None, files=[], db=db, current_user=user,
        )
        rows = list_customers(project_a.id, db, user)
        cust = next(c for c in rows if c.name == BUYER_A_NAME)
        assert float(cust.paid_total) == 15000.0, cust.paid_total
        assert float(cust.remaining_total) == 85000.0, cust.remaining_total
        print("2) payment -> paid=15000 remaining=85000")

        # 3) بيع شقة 102 لنفس المشتري → لا يتكرر كعميل جديد
        await create_unit_sale(
            project_a.id,
            payload=UnitSaleCreate(
                unit_id=unit_102.id,
                buyer_name=BUYER_A_NAME,
                sale_price=200000,
                down_payment=20000,
                sale_date=date.today(),
                cheques=[],
            ).model_dump_json(),
            files=[make_contract()],
            db=db,
            current_user=user,
        )
        rows = list_customers(project_a.id, db, user)
        same = [c for c in rows if c.name == BUYER_A_NAME]
        assert len(same) == 1, f"customer duplicated! {len(same)} rows"
        cust = same[0]
        assert sorted(u.unit_no for u in cust.units) == ["101", "102"], cust.units
        assert float(cust.sale_price_total) == 300000.0, cust.sale_price_total
        assert float(cust.paid_total) == 35000.0, cust.paid_total  # 10000+5000+20000
        assert float(cust.remaining_total) == 265000.0, cust.remaining_total
        print(f"3) second sale -> one customer, units={[u.unit_no for u in cust.units]} paid={cust.paid_total}")

        # 4) عميل من مشروع آخر لا يظهر هنا
        await create_unit_sale(
            project_b.id,
            payload=UnitSaleCreate(
                unit_id=unit_201.id,
                buyer_name=BUYER_B_NAME,
                buyer_phone="0590000222",
                sale_price=50000,
                down_payment=5000,
                sale_date=date.today(),
                cheques=[],
            ).model_dump_json(),
            files=[make_contract()],
            db=db,
            current_user=user,
        )
        rows_a = list_customers(project_a.id, db, user)
        rows_b = list_customers(project_b.id, db, user)
        assert not any(c.name == BUYER_B_NAME for c in rows_a), "other-project buyer leaked into project A"
        assert any(c.name == BUYER_B_NAME for c in rows_b)
        assert all(c.project_id == project_a.id for c in rows_a)
        print("4) project isolation OK")

        # 5) تفاصيل العميل: الوحدات + معلومات البيع
        detail = get_customer(project_a.id, cust.id, db, user)
        assert len(detail.units) == 2
        by_no = {u.unit_no: u for u in detail.units}
        assert float(by_no["101"].sale_price) == 100000.0
        assert float(by_no["101"].down_payment) == 10000.0
        assert float(by_no["102"].sale_price) == 200000.0
        assert float(detail.sale_price_total) == 300000.0
        assert float(detail.paid_total) == 35000.0
        assert float(detail.remaining_total) == 265000.0
        print("5) detail -> units + sale info OK")

        # 6) قبض فقط — صادر مرفوض
        rejected = False
        try:
            await create_customer_transaction(
                project_a.id, cust.id,
                type="cash_out", amount="100", transaction_date=str(date.today()),
                method="cash", due_date=None, files=[], db=db, current_user=user,
            )
        except Exception as e:
            rejected = getattr(e, "status_code", None) == 400
        assert rejected, "outgoing transaction must be rejected"
        txs = list_customer_transactions(project_a.id, cust.id, db, user)
        assert {t.type for t in txs} <= {TransactionType.cash_in, TransactionType.check_in}, {t.type for t in txs}
        print("6) incoming-only enforced OK")

        # 7) إلغاء بيع شقة 102 → تختفي من وحدات العميل (مشتقة من UnitSale)
        sale2 = db.query(UnitSale).filter(UnitSale.unit_id == unit_102.id).first()
        db.query(SaleAttachment).filter(SaleAttachment.sale_id == sale2.id).delete()
        db.query(Transaction).filter(Transaction.sale_id == sale2.id).delete()
        db.delete(sale2)
        db.commit()
        rows = list_customers(project_a.id, db, user)
        cust = next(c for c in rows if c.name == BUYER_A_NAME)
        assert sorted(u.unit_no for u in cust.units) == ["101"], cust.units
        assert float(cust.sale_price_total) == 100000.0, cust.sale_price_total
        print("7) cancelled sale -> unit removed from customer OK")

        # 8) الأطراف: المشتري مستثنى من صفحة الأطراف (لا تغيير في سلوكها)
        parties = list_parties_summary(project_a.id, db, user)
        assert not any(p.name == BUYER_A_NAME for p in parties)
        print("8) parties page unchanged (buyer excluded) OK")

        print("\nALL PASSED")
    finally:
        try:
            clean(db)
        except Exception:
            db.rollback()
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
