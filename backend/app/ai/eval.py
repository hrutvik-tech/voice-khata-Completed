from __future__ import annotations
import asyncio
import json
import statistics
import sys
import time
from datetime import datetime, timezone
try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo

from app.schemas.contracts import (
    Context,
    ShopInfo,
    CustomerRef,
    EntryRef,
    PendingQuestion,
    Transcript,
)
from app.ai.interpreter import interpret


def load_seed_customers() -> list[CustomerRef]:
    return [
        CustomerRef(id=1, name="Ramesh Sharma", area="Gandhi Nagar", phone=None, recent_count=1),
        CustomerRef(id=2, name="Ramesh Gupta", area="Station Road", phone=None, recent_count=1),
        CustomerRef(id=3, name="Suresh", area=None, phone=None, recent_count=1),
        CustomerRef(id=4, name="Amit", area=None, phone=None, recent_count=0),
    ]


async def run_eval(file_path: str):
    with open(file_path, "r", encoding="utf-8") as f:
        cases = json.load(f)

    tz = ZoneInfo("Asia/Kolkata")
    now = datetime(2026, 11, 21, 19, 0, 0, tzinfo=tz)
    shop = ShopInfo(
        shop_id=1,
        open_time="06:00",
        close_time="02:00",
        timezone="Asia/Kolkata",
        language_mode="mix",
    )
    customers = load_seed_customers()

    passed = 0
    latencies = []

    print(f"Running evaluation on {len(cases)} cases from {file_path}...")

    for case in cases:
        case_id = case["id"]
        text = case["text"]
        ctx_data = case.get("context", {})
        expected_ops = case["expected"]

        last_entry = None
        if ctx_data.get("last_entry"):
            le = ctx_data["last_entry"]
            last_entry = EntryRef(
                id=le.get("id", 1),
                customer_id=le.get("customer_id", 1),
                customer_name=le.get("customer_name", "Ramesh Sharma"),
                amount_paise=le.get("amount_paise", 34000),
                direction=le.get("direction", "credit"),
                recorded_at=now,
            )

        pending_q = None
        if ctx_data.get("pending_question"):
            pq = ctx_data["pending_question"]
            pending_q = PendingQuestion(
                kind=pq["kind"],
                turn_id=pq.get("turn_id", "turn-1"),
                options=pq.get("options", []),
            )

        context = Context(
            shop=shop,
            customers=customers,
            last_entry=last_entry,
            pending_question=pending_q,
            now=now,
        )

        transcript = Transcript(text=text)
        t0 = time.perf_counter()
        res = await interpret(transcript, context)
        latency_ms = (time.perf_counter() - t0) * 1000
        latencies.append(latency_ms)

        # Check match
        matched = True
        if len(res.operations) != len(expected_ops):
            matched = False
        else:
            for actual, exp in zip(res.operations, expected_ops):
                if actual.intent != exp.get("intent"):
                    matched = False
                    break
                if exp.get("customer_name") is not None:
                    if not actual.customer_name or actual.customer_name.strip().lower() != exp["customer_name"].strip().lower():
                        matched = False
                        break
                if exp.get("amount_paise") is not None:
                    if actual.amount_paise != exp["amount_paise"]:
                        matched = False
                        break
                if exp.get("direction") is not None:
                    if actual.direction != exp["direction"]:
                        matched = False
                        break
                if exp.get("date_expression") is not None:
                    if actual.date_expression != exp["date_expression"]:
                        matched = False
                        break
                if exp.get("choice") is not None:
                    if not actual.choice or actual.choice.strip().lower() != exp["choice"].strip().lower():
                        matched = False
                        break

        status_str = "PASS" if matched else "FAIL"
        if matched:
            passed += 1
        print(f"[{status_str}] {case_id}: \"{text}\" -> {len(res.operations)} ops ({latency_ms:.1f}ms)")

    median_lat = statistics.median(latencies) if latencies else 0.0
    print(f"\npassed {passed}/{len(cases)}")
    print(f"median LLM/eval latency: {median_lat:.1f} ms")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "test_data/sentences.json"
    asyncio.run(run_eval(path))
