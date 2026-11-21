from __future__ import annotations
import re
from datetime import datetime, date
from app.core.config import get_settings
from app.schemas.contracts import (
    Transcript,
    Context,
    Interpretation,
    Operation,
    ShopInfo,
    CustomerRef,
    Candidate,
)
from app.ai.shop_clock import business_date as real_business_date, resolve_date as real_resolve_date


def normalize_name(name: str) -> str:
    if not name:
        return ""
    return name.strip().lower()


def match_customers(name: str, customers: list[CustomerRef]) -> list[Candidate]:
    norm = normalize_name(name)
    candidates: list[Candidate] = []
    for c in customers:
        c_norm = normalize_name(c.name)
        first_name = c_norm.split()[0] if c_norm else ""
        if norm == c_norm:
            candidates.append(Candidate(customer_id=c.id, name=c.name, area=c.area, score=100.0))
        elif norm == first_name:
            candidates.append(Candidate(customer_id=c.id, name=c.name, area=c.area, score=95.0))
    return candidates


def parse_amount(text: str | None) -> int | None:
    if not text:
        return None
    m = re.search(r"\d+", text)
    if m:
        val = int(m.group(0))
        return val * 100 if val > 0 else None
    return None


def business_date(moment: datetime, shop: ShopInfo) -> date:
    return real_business_date(moment, shop)


def resolve_date(expression: str | None, moment: datetime, shop: ShopInfo) -> date:
    return real_resolve_date(expression, moment, shop)


async def interpret(transcript: Transcript, context: Context) -> Interpretation:
    settings = get_settings()
    text = transcript.text.strip()
    if text.lower() == settings.STUB_TRANSCRIPT.lower():
        op = Operation(
            intent="CREATE_TRANSACTION",
            customer_name="Ramesh Sharma",
            amount_spoken="340",
            amount_paise=34000,
            amount_check="ok",
            direction="credit",
            date_expression=None,
            business_date=business_date(context.now, context.shop),
            confidence=1.0,
        )
        return Interpretation(operations=[op], source="fast_path", language="hi")

    # UNKNOWN otherwise
    op = Operation(intent="UNKNOWN", confidence=0.0)
    return Interpretation(operations=[op], source="fallback", language=transcript.language or "hi")
