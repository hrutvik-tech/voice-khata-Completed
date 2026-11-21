from __future__ import annotations
import uuid
from datetime import datetime, time, timedelta, timezone
try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo

from app.core.tokens import hash_pin
from app.db.session import SessionLocal, init_db
from app.db.models import Shop, Customer, Transaction
from app.services import providers


def seed_demo(now: datetime | None = None):
    init_db()
    db = SessionLocal()
    try:
        kolkata_tz = ZoneInfo("Asia/Kolkata")
        if now is None:
            now_local = datetime.now(kolkata_tz)
        else:
            if now.tzinfo is None:
                now_local = now.replace(tzinfo=kolkata_tz)
            else:
                now_local = now.astimezone(kolkata_tz)

        # Delete existing demo shop if any
        existing_shop = db.query(Shop).filter(Shop.phone == "9000000001").first()
        if existing_shop:
            db.delete(existing_shop)
            db.commit()

        # Create demo shop
        shop = Shop(
            owner_name="Sharma",
            shop_name="Sharma Kirana Store",
            phone="9000000001",
            pin_hash=hash_pin("1234"),
            open_time="06:00",
            close_time="02:00",
            timezone="Asia/Kolkata",
            language_mode="mix",
            setup_complete=True,
        )
        db.add(shop)
        db.commit()
        db.refresh(shop)

        # Customers definition
        cust_defs = [
            ("Ramesh Sharma", "Gandhi Nagar", 50000),
            ("Ramesh Gupta", "Station Road", 80000),
            ("Suresh", None, 25000),
            ("Amit", None, 0),
        ]

        # 7 business days before now at 18:00 Asia/Kolkata
        # Each business day starts at 06:00
        # 7 calendar days back at 18:00
        seed_moment_local = (now_local - timedelta(days=7)).replace(
            hour=18, minute=0, second=0, microsecond=0
        )
        seed_moment_utc = seed_moment_local.astimezone(timezone.utc)
        # Business date for this seed moment
        seed_bdate = seed_moment_local.date()

        customers = {}
        ai_module = providers.ai()

        for name, area, amount_paise in cust_defs:
            name_key = ai_module.normalize_name(name)
            cust = Customer(
                shop_id=shop.id,
                name=name,
                name_key=name_key,
                phone=None,
                area=area,
                source="manual",
            )
            db.add(cust)
            db.commit()
            db.refresh(cust)
            customers[name] = (cust, amount_paise)

            if amount_paise > 0:
                txn = Transaction(
                    shop_id=shop.id,
                    customer_id=cust.id,
                    amount_paise=amount_paise,
                    direction="credit",
                    business_date=seed_bdate,
                    recorded_at=seed_moment_utc,
                    status="active",
                    source="seed",
                    language=None,
                    raw_transcript=None,
                    session_id=None,
                    idempotency_key=f"seed-{cust.id}-{uuid.uuid4().hex[:8]}",
                )
                db.add(txn)
                db.commit()

        # Compute and print balances
        results = []
        for name, (cust, _) in customers.items():
            txns = db.query(Transaction).filter(
                Transaction.customer_id == cust.id,
                Transaction.status == "active"
            ).all()
            balance = sum(
                t.amount_paise if t.direction == "credit" else -t.amount_paise
                for t in txns
            )
            rupees = balance // 100
            results.append(f"{name} ₹{rupees}")

        print(", ".join(results))
        return shop
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo()
