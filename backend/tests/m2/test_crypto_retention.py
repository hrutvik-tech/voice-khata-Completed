from __future__ import annotations
import pytest
from datetime import datetime, timedelta, timezone
from app.core.crypto import encrypt_text, decrypt_text
from app.core.retention import purge
from app.db.session import SessionLocal
from app.db.models import Transaction, ConversationSession, Shop, Customer
from app.core.tokens import hash_pin


def test_encrypt_decrypt():
    original = "Ramesh Sharma ka 340 udhaar"
    encrypted = encrypt_text(original)
    assert encrypted != original
    decrypted = decrypt_text(encrypted)
    assert decrypted == original
    assert encrypt_text(None) is None
    assert decrypt_text(None) is None


def test_retention_purge():
    db = SessionLocal()
    try:
        # Create dummy shop and customer
        shop = Shop(
            owner_name="TestOwner",
            shop_name="TestShop",
            phone="9876543210",
            pin_hash=hash_pin("1234"),
        )
        db.add(shop)
        db.commit()
        db.refresh(shop)

        cust = Customer(
            shop_id=shop.id,
            name="TestCustomer",
            name_key="testcustomer",
        )
        db.add(cust)
        db.commit()
        db.refresh(cust)

        now = datetime.now(timezone.utc)
        old_time = now - timedelta(hours=50)

        t_old = Transaction(
            shop_id=shop.id,
            customer_id=cust.id,
            amount_paise=10000,
            direction="credit",
            business_date=old_time.date(),
            recorded_at=old_time,
            idempotency_key="t-old",
            raw_transcript=encrypt_text("old speech transcript"),
        )
        t_new = Transaction(
            shop_id=shop.id,
            customer_id=cust.id,
            amount_paise=20000,
            direction="credit",
            business_date=now.date(),
            recorded_at=now,
            idempotency_key="t-new",
            raw_transcript=encrypt_text("new speech transcript"),
        )
        db.add_all([t_old, t_new])
        db.commit()

        # Run purge
        res = purge(now=now)
        assert res["transcripts_cleared"] >= 1

        db.refresh(t_old)
        db.refresh(t_new)
        assert t_old.raw_transcript is None
        assert t_new.raw_transcript is not None

        # Purge all
        res_all = purge(now=now, clear_all=True)
        db.refresh(t_new)
        assert t_new.raw_transcript is None
    finally:
        db.close()
