from __future__ import annotations
import statistics
from datetime import datetime, date, timedelta, timezone
from sqlalchemy import func, desc, or_
from sqlalchemy.orm import Session
from app.db.models import Shop, Customer, Transaction, CorrectionHistory, ConversationSession
from app.core.crypto import encrypt_text, decrypt_text
from app.schemas.contracts import CustomerRef
from app.services import providers


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def customer_balance(db: Session, customer_id: int) -> int:
    txns = db.query(Transaction).filter(
        Transaction.customer_id == customer_id,
        Transaction.status == "active"
    ).all()
    credits = sum(t.amount_paise for t in txns if t.direction == "credit")
    payments = sum(t.amount_paise for t in txns if t.direction == "payment")
    return credits - payments


def list_customers(db: Session, shop_id: int, search: str | None = None) -> list[dict]:
    query = db.query(Customer).filter(Customer.shop_id == shop_id)

    if search and search.strip():
        norm_q = providers.ai().normalize_name(search)
        raw_search = search.strip().lower()
        # Filter matching normalized query or raw query in name_key or area
        # For phone, since it is encrypted in DB, we decrypt in Python or match in-memory
        all_custs = query.all()
        filtered = []
        for c in all_custs:
            dec_phone = decrypt_text(c.phone) or ""
            c_area = (c.area or "").lower()
            if (norm_q and (norm_q in c.name_key or norm_q in c_area)) or \
               (raw_search and (raw_search in c.name.lower() or raw_search in c_area or raw_search in dec_phone)):
                filtered.append(c)
        custs = filtered
    else:
        custs = query.all()

    results = []
    for c in custs:
        # Get latest recorded_at of any entry
        latest_txn = db.query(Transaction).filter(
            Transaction.customer_id == c.id
        ).order_by(desc(Transaction.recorded_at)).first()

        last_activity_at = latest_txn.recorded_at if latest_txn else None
        bal = customer_balance(db, c.id)

        results.append({
            "id": c.id,
            "name": c.name,
            "phone": decrypt_text(c.phone),
            "area": c.area,
            "balance_paise": bal,
            "last_activity_at": last_activity_at,
        })

    # Order: newest activity first, customers with no entries last, then by name
    def sort_key(item):
        act = item["last_activity_at"]
        has_act = 1 if act is not None else 0
        ts = act.timestamp() if act is not None else 0.0
        return (-has_act, -ts, item["name"].lower())

    results.sort(key=sort_key)
    return results


def customer_refs(db: Session, shop_id: int, now: datetime) -> list[CustomerRef]:
    now_utc = _as_utc(now)
    cutoff = now_utc - timedelta(days=30)

    customers = db.query(Customer).filter(Customer.shop_id == shop_id).all()
    refs = []
    for c in customers:
        txns = db.query(Transaction).filter(
            Transaction.customer_id == c.id,
            Transaction.status == "active"
        ).all()
        recent_count = sum(1 for t in txns if _as_utc(t.recorded_at) >= cutoff)
        latest_txn = db.query(Transaction).filter(
            Transaction.customer_id == c.id
        ).order_by(desc(Transaction.recorded_at)).first()

        refs.append(
            CustomerRef(
                id=c.id,
                name=c.name,
                area=c.area,
                phone=decrypt_text(c.phone),
                recent_count=recent_count,
                last_activity_at=latest_txn.recorded_at if latest_txn else None,
            )
        )
    return refs


def create_customer(
    db: Session,
    shop_id: int,
    name: str,
    phone: str | None = None,
    area: str | None = None,
    source: str = "manual",
) -> Customer:
    name_key = providers.ai().normalize_name(name)
    cust = Customer(
        shop_id=shop_id,
        name=name.strip(),
        name_key=name_key,
        phone=encrypt_text(phone.strip() if phone else None),
        area=area.strip() if area else None,
        source=source,
    )
    db.add(cust)
    db.commit()
    db.refresh(cust)
    return cust


def create_entry(
    db: Session,
    shop_id: int,
    customer_id: int,
    amount_paise: int,
    direction: str,
    business_date: date,
    recorded_at: datetime,
    status: str = "active",
    source: str = "voice",
    language: str | None = None,
    raw_transcript: str | None = None,
    session_id: str | None = None,
    idempotency_key: str | None = None,
) -> tuple[Transaction, bool]:
    if recorded_at.tzinfo is None:
        recorded_at = recorded_at.replace(tzinfo=timezone.utc)
    else:
        recorded_at = recorded_at.astimezone(timezone.utc)

    # Check idempotency
    existing = db.query(Transaction).filter(
        Transaction.idempotency_key == idempotency_key
    ).first()
    if existing:
        return existing, False

    txn = Transaction(
        shop_id=shop_id,
        customer_id=customer_id,
        amount_paise=amount_paise,
        direction=direction,
        business_date=business_date,
        recorded_at=recorded_at,
        status=status,
        source=source,
        language=language,
        raw_transcript=encrypt_text(raw_transcript),
        session_id=session_id,
        idempotency_key=idempotency_key,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn, True


def amend_entry(
    db: Session,
    txn_id: int,
    new_amount_paise: int,
    session_id: str | None,
    at: datetime,
) -> tuple[Transaction, CorrectionHistory]:
    if at.tzinfo is None:
        at = at.replace(tzinfo=timezone.utc)
    else:
        at = at.astimezone(timezone.utc)

    txn = db.query(Transaction).filter(Transaction.id == txn_id).first()
    if not txn:
        raise ValueError(f"Transaction {txn_id} not found")

    old_amount = txn.amount_paise
    txn.amount_paise = new_amount_paise

    hist = CorrectionHistory(
        transaction_id=txn.id,
        action="amend",
        old_amount_paise=old_amount,
        new_amount_paise=new_amount_paise,
        session_id=session_id,
        at=at,
    )
    db.add(hist)
    db.commit()
    db.refresh(txn)
    db.refresh(hist)
    return txn, hist


def undo_entry(
    db: Session,
    txn_id: int,
    session_id: str | None,
    at: datetime,
) -> tuple[Transaction, CorrectionHistory]:
    if at.tzinfo is None:
        at = at.replace(tzinfo=timezone.utc)
    else:
        at = at.astimezone(timezone.utc)

    txn = db.query(Transaction).filter(Transaction.id == txn_id).first()
    if not txn:
        raise ValueError(f"Transaction {txn_id} not found")

    old_amount = txn.amount_paise
    txn.status = "undone"

    hist = CorrectionHistory(
        transaction_id=txn.id,
        action="undo",
        old_amount_paise=old_amount,
        new_amount_paise=None,
        session_id=session_id,
        at=at,
    )
    db.add(hist)
    db.commit()
    db.refresh(txn)
    db.refresh(hist)
    return txn, hist


def find_recent_duplicate(
    db: Session,
    customer_id: int,
    amount_paise: int,
    direction: str,
    now: datetime,
    window_seconds: int = 120,
) -> Transaction | None:
    now_utc = _as_utc(now)
    cutoff = now_utc - timedelta(seconds=window_seconds)

    txns = db.query(Transaction).filter(
        Transaction.customer_id == customer_id,
        Transaction.amount_paise == amount_paise,
        Transaction.direction == direction,
        Transaction.status == "active",
    ).all()
    for t in txns:
        t_rec = _as_utc(t.recorded_at)
        if cutoff <= t_rec <= now_utc:
            return t
    return None


def credit_stats(db: Session, customer_id: int) -> tuple[int, int]:
    credits = db.query(Transaction).filter(
        Transaction.customer_id == customer_id,
        Transaction.direction == "credit",
        Transaction.status == "active",
    ).order_by(desc(Transaction.recorded_at)).all()

    count = len(credits)
    if not credits:
        return 0, 0
    last_10 = [c.amount_paise for c in credits[:10]]
    med = int(statistics.median(last_10))
    return count, med


def daily_credit_total(db: Session, shop_id: int, business_date: date) -> int:
    credits = db.query(Transaction).filter(
        Transaction.shop_id == shop_id,
        Transaction.direction == "credit",
        Transaction.status == "active",
        Transaction.business_date == business_date,
    ).all()
    return sum(c.amount_paise for c in credits)


def day_summary(db: Session, shop_id: int, business_date: date) -> dict:
    credits = db.query(Transaction).filter(
        Transaction.shop_id == shop_id,
        Transaction.direction == "credit",
        Transaction.status == "active",
        Transaction.business_date == business_date,
    ).all()
    credit_paise = sum(c.amount_paise for c in credits)

    payments = db.query(Transaction).filter(
        Transaction.shop_id == shop_id,
        Transaction.direction == "payment",
        Transaction.status == "active",
        Transaction.business_date == business_date,
    ).all()
    payment_paise = sum(p.amount_paise for p in payments)

    # Top 3 positive customer balances in the shop
    customers = db.query(Customer).filter(Customer.shop_id == shop_id).all()
    cust_balances = []
    for c in customers:
        bal = customer_balance(db, c.id)
        if bal > 0:
            cust_balances.append({
                "customer_id": c.id,
                "customer_name": c.name,
                "balance_paise": bal,
            })

    cust_balances.sort(key=lambda x: x["balance_paise"], reverse=True)
    top_3 = cust_balances[:3]

    return {
        "business_date": business_date.isoformat(),
        "credit_paise": credit_paise,
        "payment_paise": payment_paise,
        "top": top_3,
    }


def delete_shop_data(db: Session, shop_id: int):
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    if shop:
        db.delete(shop)
        db.commit()
