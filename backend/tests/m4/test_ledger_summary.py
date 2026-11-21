from __future__ import annotations
from datetime import datetime, date, timedelta, timezone
import pytest
from app.db.session import SessionLocal
from app.db.models import Customer, Transaction, CorrectionHistory
from app.services import ledger


def test_customers_and_ledger_services(client, auth_headers, demo_shop):
    db = SessionLocal()
    try:
        # 1. Check seed balances
        custs = ledger.list_customers(db, demo_shop.id)
        assert len(custs) == 4

        # 2. Search by area "Station Road"
        search_res = client.get("/customers?search=station", headers=auth_headers)
        assert search_res.status_code == 200
        assert len(search_res.json()) == 1
        assert search_res.json()[0]["name"] == "Ramesh Gupta"

        # 3. Create customer with similar name -> 409
        sim_res = client.post("/customers", headers=auth_headers, json={
            "name": "Ramesh Verma",
            "phone": "9988776655",
            "area": "Main Market",
            "confirm": False,
        })
        assert sim_res.status_code == 409
        assert sim_res.json()["detail"] == "similar_exists"

        # With confirm=True -> 201
        create_res = client.post("/customers", headers=auth_headers, json={
            "name": "Ramesh Verma",
            "phone": "9988776655",
            "area": "Main Market",
            "confirm": True,
        })
        assert create_res.status_code == 201
        verma_id = create_res.json()["customer"]["id"]

        # 4. Check encryption: in DB, phone must not be plain text
        verma_db = db.query(Customer).filter(Customer.id == verma_id).first()
        assert verma_db.phone != "9988776655"

        # 5. Idempotent create_entry
        now = datetime.now(timezone.utc)
        b_date = date(2026, 11, 21)
        t1, created1 = ledger.create_entry(
            db=db,
            shop_id=demo_shop.id,
            customer_id=verma_id,
            amount_paise=10000,
            direction="credit",
            business_date=b_date,
            recorded_at=now,
            idempotency_key="verma-1",
            raw_transcript="Verma ka 100 udhaar",
        )
        assert created1 is True

        t2, created2 = ledger.create_entry(
            db=db,
            shop_id=demo_shop.id,
            customer_id=verma_id,
            amount_paise=10000,
            direction="credit",
            business_date=b_date,
            recorded_at=now,
            idempotency_key="verma-1",
        )
        assert created2 is False
        assert t1.id == t2.id

        # 6. Amend entry
        t_amended, hist_amend = ledger.amend_entry(db, t1.id, 15000, "sess-1", now)
        assert t_amended.amount_paise == 15000
        assert hist_amend.old_amount_paise == 10000
        assert ledger.customer_balance(db, verma_id) == 15000

        # 7. Undo entry
        t_undone, hist_undo = ledger.undo_entry(db, t1.id, "sess-1", now)
        assert t_undone.status == "undone"
        assert hist_undo.old_amount_paise == 15000
        assert ledger.customer_balance(db, verma_id) == 0

        # 8. Duplicate check inside and outside 120s
        t_new, _ = ledger.create_entry(
            db=db,
            shop_id=demo_shop.id,
            customer_id=verma_id,
            amount_paise=5000,
            direction="credit",
            business_date=b_date,
            recorded_at=now,
            idempotency_key="verma-dup-test",
        )
        dup = ledger.find_recent_duplicate(db, verma_id, 5000, "credit", now + timedelta(seconds=60), 120)
        assert dup is not None
        no_dup = ledger.find_recent_duplicate(db, verma_id, 5000, "credit", now + timedelta(seconds=130), 120)
        assert no_dup is None

        # 9. Summary endpoint
        sum_res = client.get("/summary/today", headers=auth_headers)
        assert sum_res.status_code == 200
        sum_data = sum_res.json()
        assert "credit_paise" in sum_data
        assert "payment_paise" in sum_data
        assert "top" in sum_data

        # 10. Another shop's customer -> 404
        other_res = client.get("/customers/999999", headers=auth_headers)
        assert other_res.status_code == 404
    finally:
        db.close()
