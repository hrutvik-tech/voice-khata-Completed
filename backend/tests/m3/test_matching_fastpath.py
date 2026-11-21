from __future__ import annotations
import pytest
from datetime import datetime, timezone
from app.schemas.contracts import CustomerRef, Context, ShopInfo, PendingQuestion
from app.ai.matching import normalize_name, match_customers
from app.ai.fast_path import try_fast_path


def test_normalize_name():
    assert normalize_name("Ramesh Sharma ji") == "ramesh sharma"
    assert normalize_name("Suresh bhai!") == "suresh"
    assert normalize_name("Gupta Sahab") == "gupta"
    assert normalize_name("  Amit   Bhaiya  ") == "amit"
    assert normalize_name("Kumar Avare") == "kumar"


def test_match_customers():
    custs = [
        CustomerRef(id=1, name="Ramesh Sharma", area="Gandhi Nagar", phone=None, recent_count=5),
        CustomerRef(id=2, name="Ramesh Gupta", area="Station Road", phone=None, recent_count=2),
        CustomerRef(id=3, name="Suresh", area=None, phone=None, recent_count=1),
        CustomerRef(id=4, name="Amit", area=None, phone=None, recent_count=0),
    ]

    # "Ramesh" -> Ramesh Sharma and Ramesh Gupta both 95
    cands_ramesh = match_customers("Ramesh", custs)
    assert len(cands_ramesh) == 2
    assert cands_ramesh[0].score == 95.0
    assert cands_ramesh[1].score == 95.0
    # Ramesh Sharma has higher recent_count (5 vs 2), so first
    assert cands_ramesh[0].name == "Ramesh Sharma"
    assert cands_ramesh[1].name == "Ramesh Gupta"

    # "Ramesh Sharma" -> only Ramesh Sharma
    cands_exact = match_customers("Ramesh Sharma", custs)
    assert len(cands_exact) >= 1
    assert cands_exact[0].name == "Ramesh Sharma"
    assert cands_exact[0].score == 100.0

    # "Gupta" -> Ramesh Gupta
    cands_gupta = match_customers("Gupta", custs)
    assert len(cands_gupta) >= 1
    assert cands_gupta[0].name == "Ramesh Gupta"
    assert cands_gupta[0].score == 95.0

    # "Station Road" -> Ramesh Gupta
    cands_area = match_customers("Station Road", custs)
    assert len(cands_area) >= 1
    assert cands_area[0].name == "Ramesh Gupta"
    assert cands_area[0].score == 95.0

    # "Rmesh Sharma" -> Ramesh Sharma at 95
    cands_typo = match_customers("Rmesh Sharma", custs)
    assert len(cands_typo) >= 1
    assert cands_typo[0].name == "Ramesh Sharma"

    # "Ramesh Verma" -> Ramesh Sharma between 75 and 89 (similar name)
    cands_verma = match_customers("Ramesh Verma", custs)
    assert len(cands_verma) >= 1
    assert 75 <= cands_verma[0].score <= 89
    assert cands_verma[0].name == "Ramesh Sharma"


def test_try_fast_path():
    shop = ShopInfo(shop_id=1, open_time="06:00", close_time="02:00", timezone="Asia/Kolkata", language_mode="mix")
    now = datetime(2026, 11, 21, 19, 0, tzinfo=timezone.utc)

    # 1. No pending question: "Nahi, 430" -> CORRECTION
    ctx_no_q = Context(shop=shop, customers=[], last_entry=None, pending_question=None, now=now)
    res_corr = try_fast_path("Nahi, 430", ctx_no_q)
    assert res_corr is not None
    assert res_corr.operations[0].intent == "CORRECTION"
    assert res_corr.operations[0].amount_paise == 43000

    # 2. With pending confirm: "nahi" -> CONFIRM "no"
    pq = PendingQuestion(kind="confirm_duplicate", turn_id="t1", options=[])
    ctx_with_q = Context(shop=shop, customers=[], last_entry=None, pending_question=pq, now=now)
    res_no = try_fast_path("nahi", ctx_with_q)
    assert res_no is not None
    assert res_no.operations[0].intent == "CONFIRM"
    assert res_no.operations[0].choice == "no"

    # 3. "Pichla hatao" -> UNDO_LAST
    res_undo = try_fast_path("pichla hatao", ctx_no_q)
    assert res_undo is not None
    assert res_undo.operations[0].intent == "UNDO_LAST"

    # 4. "Ramesh ka total?" -> QUERY_BALANCE
    res_bal = try_fast_path("Ramesh ka total?", ctx_no_q)
    assert res_bal is not None
    assert res_bal.operations[0].intent == "QUERY_BALANCE"
    assert res_bal.operations[0].customer_name == "ramesh"

    # 5. "Aaj kitna udhaar gaya?" -> QUERY_DAILY_TOTAL
    res_tot = try_fast_path("Aaj kitna udhaar gaya?", ctx_no_q)
    assert res_tot is not None
    assert res_tot.operations[0].intent == "QUERY_DAILY_TOTAL"

    # 6. "Aaj ka hisaab" -> QUERY_DAY_SUMMARY
    res_sum = try_fast_path("Aaj ka hisaab", ctx_no_q)
    assert res_sum is not None
    assert res_sum.operations[0].intent == "QUERY_DAY_SUMMARY"

    # 7. Devanagari sentence returns None
    res_dev = try_fast_path("आज का हिसाब", ctx_no_q)
    assert res_dev is None
