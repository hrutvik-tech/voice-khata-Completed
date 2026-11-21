from __future__ import annotations
import pytest
from sqlalchemy import inspect
from app.db.session import engine, SessionLocal
from app.db.models import Customer, Transaction
from app.db.seed import seed_demo


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"ok": True}


def test_five_tables_exist():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    expected = {"shops", "customers", "transactions", "correction_history", "conversation_sessions"}
    assert expected.issubset(set(tables))


def test_seed_demo_balances():
    shop = seed_demo()
    assert shop is not None
    db = SessionLocal()
    try:
        customers = db.query(Customer).filter(Customer.shop_id == shop.id).all()
        bal_map = {}
        for c in customers:
            txns = db.query(Transaction).filter(
                Transaction.customer_id == c.id,
                Transaction.status == "active"
            ).all()
            b = sum(t.amount_paise if t.direction == "credit" else -t.amount_paise for t in txns)
            bal_map[c.name] = b

        assert bal_map["Ramesh Sharma"] == 50000
        assert bal_map["Ramesh Gupta"] == 80000
        assert bal_map["Suresh"] == 25000
        assert bal_map["Amit"] == 0
    finally:
        db.close()


def test_current_shop_rejects_missing_or_bad_token(client):
    # Missing token
    res = client.get("/shop")
    assert res.status_code == 401

    # Bad token
    res = client.get("/shop", headers={"Authorization": "Bearer bad.token.here"})
    assert res.status_code == 401
