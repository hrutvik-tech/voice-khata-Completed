from __future__ import annotations
from datetime import datetime, timedelta
try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo
import pytest
from app.db.session import SessionLocal
from app.db.models import Customer, Transaction, CorrectionHistory, Shop
from app.services import ledger


def test_final_judge_script(client, auth_headers):
    tz = ZoneInfo("Asia/Kolkata")
    now_dt = datetime(2026, 11, 21, 19, 0, 0, tzinfo=tz)
    now_iso = now_dt.isoformat()

    # Reset demo shop
    res_reset = client.post("/debug/reset", headers=auth_headers, json={"now": now_iso})
    assert res_reset.status_code == 204

    db = SessionLocal()
    shop = db.query(Shop).filter(Shop.phone == "9000000001").first()
    sharma = db.query(Customer).filter(Customer.name == "Ramesh Sharma").first()
    gupta = db.query(Customer).filter(Customer.name == "Ramesh Gupta").first()
    suresh = db.query(Customer).filter(Customer.name == "Suresh").first()
    amit = db.query(Customer).filter(Customer.name == "Amit").first()
    db.close()

    session_id = None

    # Step 1: "Ramesh Sharma ka 340 udhaar"
    r1 = client.post("/debug/turn", headers=auth_headers, json={
        "text": "Ramesh Sharma ka 340 udhaar",
        "now": now_iso,
        "session_id": session_id,
    })
    assert r1.status_code == 200
    data1 = r1.json()
    session_id = data1["session_id"]
    events1 = data1["events"]
    ans1 = [e for e in events1 if e.get("type") == "answer"][0]
    assert "नमस्ते, मैं मुंशी हूँ" in ans1["say"]
    entry1 = [e for e in events1 if e.get("type") == "entry"][0]
    assert entry1["entry"]["amount_paise"] == 34000
    assert entry1["entry"]["direction"] == "credit"
    assert entry1["balance_paise"] == 84000

    # Step 2: "Nahi, 430"
    r2 = client.post("/debug/turn", headers=auth_headers, json={
        "text": "Nahi, 430",
        "now": now_iso,
        "session_id": session_id,
    })
    assert r2.status_code == 200
    events2 = r2.json()["events"]
    ans2 = [e for e in events2 if e.get("type") == "answer"][0]
    assert "नमस्ते, मैं मुंशी हूँ" not in ans2["say"]
    entry2 = [e for e in events2 if e.get("type") == "entry"][0]
    assert entry2["entry"]["status"] == "amended"
    assert entry2["entry"]["amount_paise"] == 43000
    assert entry2["entry"]["old_amount_paise"] == 34000
    assert entry2["balance_paise"] == 93000

    # Step 3: "Suresh ka 200 udhaar, kal 100 diya tha"
    r3 = client.post("/debug/turn", headers=auth_headers, json={
        "text": "Suresh ka 200 udhaar, kal 100 diya tha",
        "now": now_iso,
        "session_id": session_id,
    })
    assert r3.status_code == 200
    events3 = r3.json()["events"]
    entries3 = [e for e in events3 if e.get("type") == "entry"]
    assert len(entries3) == 2
    assert entries3[0]["entry"]["amount_paise"] == 20000
    assert entries3[0]["entry"]["direction"] == "credit"
    assert entries3[1]["entry"]["amount_paise"] == 10000
    assert entries3[1]["entry"]["direction"] == "payment"
    assert entries3[1]["balance_paise"] == 35000

    # Step 4: "Suresh ka 200 udhaar" (Duplicate within 120s)
    r4 = client.post("/debug/turn", headers=auth_headers, json={
        "text": "Suresh ka 200 udhaar",
        "now": now_iso,
        "session_id": session_id,
    })
    assert r4.status_code == 200
    events4 = r4.json()["events"]
    q4 = [e for e in events4 if e.get("type") == "question"][0]
    assert q4["kind"] == "confirm_duplicate"
    turn_id4 = r4.json()["turn_id"]

    # Step 5: choose {"answer": "no"}
    r5 = client.post("/debug/choose", headers=auth_headers, json={
        "session_id": session_id,
        "turn_id": turn_id4,
        "choice": {"answer": "no"},
        "now": now_iso,
    })
    assert r5.status_code == 200
    events5 = r5.json()["events"]
    ans5 = [e for e in events5 if e.get("type") == "answer"][0]
    assert ans5["kind"] == "cancelled"

    # Step 6: "Amit ka 50 udhaar"
    r6 = client.post("/debug/turn", headers=auth_headers, json={
        "text": "Amit ka 50 udhaar",
        "now": now_iso,
        "session_id": session_id,
    })
    assert r6.status_code == 200
    events6 = r6.json()["events"]
    entry6 = [e for e in events6 if e.get("type") == "entry"][0]
    assert entry6["entry"]["amount_paise"] == 5000
    assert entry6["balance_paise"] == 5000

    # Step 7: "Pichla hatao"
    r7 = client.post("/debug/turn", headers=auth_headers, json={
        "text": "Pichla hatao",
        "now": now_iso,
        "session_id": session_id,
    })
    assert r7.status_code == 200
    events7 = r7.json()["events"]
    entry7 = [e for e in events7 if e.get("type") == "entry"][0]
    assert entry7["entry"]["status"] == "undone"
    assert entry7["balance_paise"] == 0

    # Step 8: "Ramesh ka total?"
    r8 = client.post("/debug/turn", headers=auth_headers, json={
        "text": "Ramesh ka total?",
        "now": now_iso,
        "session_id": session_id,
    })
    assert r8.status_code == 200
    events8 = r8.json()["events"]
    q8 = [e for e in events8 if e.get("type") == "question"][0]
    assert q8["kind"] == "choose_customer"
    assert q8["options"][0]["label"] == "Ramesh Sharma"
    assert q8["options"][1]["label"] == "Ramesh Gupta"
    turn_id8 = r8.json()["turn_id"]

    # Step 9: choose Ramesh Gupta's id
    r9 = client.post("/debug/choose", headers=auth_headers, json={
        "session_id": session_id,
        "turn_id": turn_id8,
        "choice": {"customer_id": gupta.id},
        "now": now_iso,
    })
    assert r9.status_code == 200
    events9 = r9.json()["events"]
    ans9 = [e for e in events9 if e.get("type") == "answer"][0]
    assert ans9["kind"] == "balance"
    assert ans9["data"]["balance_paise"] == 80000

    # Step 10: "Aaj kitna udhaar gaya?"
    r10 = client.post("/debug/turn", headers=auth_headers, json={
        "text": "Aaj kitna udhaar gaya?",
        "now": now_iso,
        "session_id": session_id,
    })
    assert r10.status_code == 200
    events10 = r10.json()["events"]
    ans10 = [e for e in events10 if e.get("type") == "answer"][0]
    assert ans10["kind"] == "daily_total"
    assert ans10["data"]["credit_paise"] == 63000

    # Step 11: "Aaj ka hisaab"
    r11 = client.post("/debug/turn", headers=auth_headers, json={
        "text": "Aaj ka hisaab",
        "now": now_iso,
        "session_id": session_id,
    })
    assert r11.status_code == 200
    events11 = r11.json()["events"]
    ans11 = [e for e in events11 if e.get("type") == "answer"][0]
    assert ans11["kind"] == "day_summary"
    assert ans11["data"]["credit_paise"] == 63000
    assert ans11["data"]["payment_paise"] == 0
    top = ans11["data"]["top"]
    assert top[0]["customer_name"] == "Ramesh Sharma" and top[0]["balance_paise"] == 93000
    assert top[1]["customer_name"] == "Ramesh Gupta" and top[1]["balance_paise"] == 80000
    assert top[2]["customer_name"] == "Suresh" and top[2]["balance_paise"] == 35000

    # Step 12: tomorrow 01:05 - "Amit ka 70 udhaar" (>30 min idle jump -> new session)
    dt_12 = datetime(2026, 11, 22, 1, 5, 0, tzinfo=tz)
    r12 = client.post("/debug/turn", headers=auth_headers, json={
        "text": "Amit ka 70 udhaar",
        "now": dt_12.isoformat(),
        "session_id": None,
    })
    assert r12.status_code == 200
    data12 = r12.json()
    events12 = data12["events"]
    session_id12 = data12["session_id"]
    ans12 = [e for e in events12 if e.get("type") == "answer"][0]
    assert "नमस्ते, मैं मुंशी हूँ" in ans12["say"]
    entry12 = [e for e in events12 if e.get("type") == "entry"][0]
    assert entry12["entry"]["amount_paise"] == 7000
    assert entry12["entry"]["business_date"] == "2026-11-21"  # 01:05 belongs to 21st!
    assert entry12["balance_paise"] == 7000

    # Step 13: tomorrow 01:10 - "Aaj kitna udhaar gaya?"
    dt_13 = datetime(2026, 11, 22, 1, 10, 0, tzinfo=tz)
    r13 = client.post("/debug/turn", headers=auth_headers, json={
        "text": "Aaj kitna udhaar gaya?",
        "now": dt_13.isoformat(),
        "session_id": session_id12,
    })
    assert r13.status_code == 200
    events13 = r13.json()["events"]
    ans13 = [e for e in events13 if e.get("type") == "answer"][0]
    assert ans13["data"]["credit_paise"] == 70000

    # Step 14: tomorrow 01:12 - "Kal mausam achha tha"
    dt_14 = datetime(2026, 11, 22, 1, 12, 0, tzinfo=tz)
    r14 = client.post("/debug/turn", headers=auth_headers, json={
        "text": "Kal mausam achha tha",
        "now": dt_14.isoformat(),
        "session_id": session_id12,
    })
    assert r14.status_code == 200
    events14 = r14.json()["events"]
    assert any(e.get("type") == "not_understood" for e in events14)

    # Step 15: tomorrow 01:14 - Kannada sentence: ₹100 credit to Suresh
    dt_15 = datetime(2026, 11, 22, 1, 14, 0, tzinfo=tz)
    r15 = client.post("/debug/turn", headers=auth_headers, json={
        "text": "Suresh ge nooru roopayi saala",
        "now": dt_15.isoformat(),
        "session_id": session_id12,
    })
    assert r15.status_code == 200
    events15 = r15.json()["events"]
    entry15 = [e for e in events15 if e.get("type") == "entry"][0]
    assert entry15["entry"]["amount_paise"] == 10000
    assert entry15["entry"]["direction"] == "credit"
    assert entry15["balance_paise"] == 45000

    # Step 16: tomorrow 01:15 - Kannada question for Suresh's balance
    dt_16 = datetime(2026, 11, 22, 1, 15, 0, tzinfo=tz)
    r16 = client.post("/debug/turn", headers=auth_headers, json={
        "text": "Suresh balance eshtu?",
        "now": dt_16.isoformat(),
        "session_id": session_id12,
    })
    assert r16.status_code == 200
    events16 = r16.json()["events"]
    ans16 = [e for e in events16 if e.get("type") == "answer"][0]
    assert ans16["kind"] == "balance"
    assert ans16["data"]["balance_paise"] == 45000

    # Final database verification
    db = SessionLocal()
    try:
        sharma_bal = ledger.customer_balance(db, sharma.id)
        gupta_bal = ledger.customer_balance(db, gupta.id)
        suresh_bal = ledger.customer_balance(db, suresh.id)
        amit_bal = ledger.customer_balance(db, amit.id)

        assert sharma_bal == 93000
        assert gupta_bal == 80000
        assert suresh_bal == 45000
        assert amit_bal == 7000

        # correction_history has exactly two rows:
        # an amend of Ramesh Sharma's entry (34000 to 43000) and an undo of Amit's 5000 entry
        hist_rows = db.query(CorrectionHistory).all()
        assert len(hist_rows) == 2
        actions = [(h.action, h.old_amount_paise, h.new_amount_paise) for h in hist_rows]
        assert ("amend", 34000, 43000) in actions
        assert ("undo", 5000, None) in actions
    finally:
        db.close()
