from __future__ import annotations
from datetime import datetime, timezone, timedelta
try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo
import pytest
from app.db.session import SessionLocal
from app.db.models import Customer, Transaction, ConversationSession
from app.schemas.contracts import Transcript, Operation, Interpretation
from app.services.conversation import get_or_create_session
from app.services.orchestrator import handle_transcript, handle_choice


@pytest.mark.asyncio
async def test_orchestrator_disclosure_and_turn_flow(demo_shop):
    db = SessionLocal()
    try:
        now = datetime(2026, 11, 21, 19, 0, tzinfo=ZoneInfo("Asia/Kolkata"))
        session = get_or_create_session(db, demo_shop.id, now)

        # 1. First turn: "Ramesh Sharma ka 340 udhaar"
        t1 = Transcript(text="Ramesh Sharma ka 340 udhaar", language="hi")
        events1 = await handle_transcript(session.id, "turn-1", t1, now)

        # Check disclosure exists in first final answer
        final_answer1 = [e for e in events1 if e.get("type") == "answer"][0]
        assert "नमस्ते, मैं मुंशी हूँ" in final_answer1["say"]
        assert len([e for e in events1 if e.get("type") == "entry"]) == 1

        # Check balance after first turn (50000 + 34000 = 84000)
        c_sharma = db.query(Customer).filter(Customer.name == "Ramesh Sharma").first()
        txns = db.query(Transaction).filter(Transaction.customer_id == c_sharma.id, Transaction.status == "active").all()
        bal1 = sum(t.amount_paise if t.direction == "credit" else -t.amount_paise for t in txns)
        assert bal1 == 84000

        # 2. Second turn: "Nahi, 430" (no disclosure this time!)
        t2 = Transcript(text="Nahi, 430", language="hi")
        events2 = await handle_transcript(session.id, "turn-2", t2, now + timedelta(seconds=10))

        final_answer2 = [e for e in events2 if e.get("type") == "answer"][0]
        assert "नमस्ते, मैं मुंशी हूँ" not in final_answer2["say"]
        amended_entries = [e for e in events2 if e.get("type") == "entry" and e.get("entry", {}).get("status") == "amended"]
        assert len(amended_entries) == 1
        assert amended_entries[0]["entry"]["amount_paise"] == 43000
    finally:
        db.close()


@pytest.mark.asyncio
async def test_orchestrator_multi_operation(demo_shop):
    db = SessionLocal()
    try:
        now = datetime(2026, 11, 21, 19, 0, tzinfo=ZoneInfo("Asia/Kolkata"))
        session = get_or_create_session(db, demo_shop.id, now)

        # "Suresh ka 200 udhaar, kal 100 diya tha"
        t = Transcript(text="Suresh ka 200 udhaar, kal 100 diya tha", language="hi")
        events = await handle_transcript(session.id, "turn-multi", t, now)

        entry_events = [e for e in events if e.get("type") == "entry"]
        assert len(entry_events) == 2

        # First entry: credit 20000, today
        assert entry_events[0]["entry"]["direction"] == "credit"
        assert entry_events[0]["entry"]["amount_paise"] == 20000
        assert entry_events[0]["entry"]["business_date"] == "2026-11-21"

        # Second entry: payment 10000, yesterday (2026-11-20)
        assert entry_events[1]["entry"]["direction"] == "payment"
        assert entry_events[1]["entry"]["amount_paise"] == 10000
        assert entry_events[1]["entry"]["business_date"] == "2026-11-20"
    finally:
        db.close()


@pytest.mark.asyncio
async def test_orchestrator_ambiguity_and_choice(demo_shop):
    db = SessionLocal()
    try:
        now = datetime(2026, 11, 21, 19, 0, tzinfo=ZoneInfo("Asia/Kolkata"))
        session = get_or_create_session(db, demo_shop.id, now)

        # "Ramesh ka total?" -> Two Rameshes (Ramesh Sharma, Ramesh Gupta)
        t = Transcript(text="Ramesh ka total?", language="hi")
        events = await handle_transcript(session.id, "turn-ambig", t, now)

        q_events = [e for e in events if e.get("type") == "question"]
        assert len(q_events) == 1
        assert q_events[0]["kind"] == "choose_customer"
        assert len(q_events[0]["options"]) == 2

        # Answer with choose: Ramesh Gupta
        gupta = db.query(Customer).filter(Customer.name == "Ramesh Gupta").first()
        res_events = await handle_choice(session.id, "turn-ambig", {"customer_id": gupta.id}, now)
        ans_events = [e for e in res_events if e.get("type") == "answer"]
        assert len(ans_events) == 1
        assert ans_events[0]["kind"] == "balance"
        assert ans_events[0]["data"]["balance_paise"] == 80000
    finally:
        db.close()
