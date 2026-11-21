from __future__ import annotations
from datetime import datetime, date
from typing import Literal
from pydantic import BaseModel, Field

Lang = Literal["hi", "kn", "en"]
Intent = Literal[
    "CREATE_TRANSACTION",
    "CORRECTION",
    "UNDO_LAST",
    "QUERY_BALANCE",
    "QUERY_DAILY_TOTAL",
    "QUERY_DAY_SUMMARY",
    "CONFIRM",
    "CHOOSE_CUSTOMER",
    "UNKNOWN",
]


class Transcript(BaseModel):
    text: str
    language: Lang | None = None
    latency_ms: int | None = None


class ShopInfo(BaseModel):
    shop_id: int
    open_time: str
    close_time: str
    timezone: str
    language_mode: Literal["hi", "kn", "en", "mix"]


class CustomerRef(BaseModel):
    id: int
    name: str
    area: str | None = None
    phone: str | None = None
    recent_count: int = 0
    last_activity_at: datetime | None = None


class EntryRef(BaseModel):
    id: int
    customer_id: int
    customer_name: str
    amount_paise: int
    direction: Literal["credit", "payment"]
    recorded_at: datetime


class PendingQuestion(BaseModel):
    kind: str
    turn_id: str
    options: list[dict]
    about: dict = Field(default_factory=dict)


class Context(BaseModel):
    shop: ShopInfo
    customers: list[CustomerRef]
    last_entry: EntryRef | None = None
    pending_question: PendingQuestion | None = None
    now: datetime


class Operation(BaseModel):
    intent: Intent
    customer_name: str | None = None
    amount_spoken: str | None = None
    amount_paise: int | None = None
    amount_check: Literal["ok", "mismatch", "unparsed", "none"] = "none"
    direction: Literal["credit", "payment"] | None = None
    date_expression: str | None = None
    business_date: date | None = None
    choice: str | None = None
    confidence: float = 1.0


class Interpretation(BaseModel):
    operations: list[Operation]
    source: Literal["fast_path", "llm", "fallback"]
    language: Lang


class Candidate(BaseModel):
    customer_id: int
    name: str
    area: str | None = None
    score: float
