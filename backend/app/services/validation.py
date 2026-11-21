from __future__ import annotations
from datetime import datetime, timedelta, timezone
from app.schemas.contracts import Operation, Candidate, EntryRef

AMEND_WINDOW_SECONDS = 60
DUPLICATE_WINDOW_SECONDS = 120
SESSION_IDLE_MINUTES = 30
MAX_AMOUNT_PAISE = 100000000  # ₹10,00,000
MIN_CONFIDENCE = 0.6


def is_outlier(earlier_credit_count: int, median_last_10: int, amount_paise: int) -> bool:
    # Outlier rule: at least 3 earlier credits, and amount above 5 x median of last 10 credits, and above 200000 paise
    if earlier_credit_count >= 3 and amount_paise > 200000:
        if amount_paise > 5 * median_last_10:
            return True
    return False


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def is_within_amend_window(last_entry_at: datetime | None, now: datetime) -> bool:
    if last_entry_at is None:
        return False
    now_utc = _as_utc(now)
    last_utc = _as_utc(last_entry_at)
    diff = (now_utc - last_utc).total_seconds()
    return 0 <= diff <= AMEND_WINDOW_SECONDS
