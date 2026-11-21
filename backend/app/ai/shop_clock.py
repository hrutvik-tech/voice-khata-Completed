from __future__ import annotations
import re
from datetime import datetime, date, time, timedelta
try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo

from app.schemas.contracts import ShopInfo


def parse_hh_mm(t_str: str) -> tuple[int, int]:
    parts = t_str.strip().split(":")
    return int(parts[0]), int(parts[1])


def business_date(moment: datetime, shop: ShopInfo) -> date:
    tz = ZoneInfo(shop.timezone)
    if moment.tzinfo is None:
        local_dt = moment.replace(tzinfo=tz)
    else:
        local_dt = moment.astimezone(tz)

    open_h, open_m = parse_hh_mm(shop.open_time)
    # The business day runs from open_time to the next open_time.
    # If the current time is before open_time, it belongs to the previous calendar date.
    if (local_dt.hour, local_dt.minute) < (open_h, open_m):
        return (local_dt.date() - timedelta(days=1))
    return local_dt.date()


TODAY_WORDS = {
    "aaj", "आज", "today", "indu", "ivattu", "ಇಂದು", "ಇವತ್ತು"
}

YESTERDAY_WORDS = {
    "kal", "कल", "yesterday", "ninne", "ನಿನ್ನೆ"
}

DAY_BEFORE_WORDS = {
    "parso", "parson", "परसों", "day before yesterday", "monne", "ಮೊನ್ನೆ"
}


def resolve_date(expression: str | None, moment: datetime, shop: ShopInfo) -> date:
    b_date = business_date(moment, shop)
    if not expression:
        return b_date

    clean = expression.strip().lower()

    if clean in TODAY_WORDS:
        return b_date

    if clean in YESTERDAY_WORDS:
        return b_date - timedelta(days=1)

    if clean in DAY_BEFORE_WORDS:
        return b_date - timedelta(days=2)

    # Check for "N din pehle" / "N days ago" / "N dina hinde"
    m = re.search(r"(\d+)\s*(?:din\s+pehle|days?\s+ago|dina\s+hinde)", clean)
    if m:
        n = int(m.group(1))
        n = min(max(n, 0), 30)
        return b_date - timedelta(days=n)

    # Also handle word numbers if needed (e.g. teen din pehle)
    word_map = {"ek": 1, "do": 2, "teen": 3, "char": 4, "chaar": 4, "panch": 5, "paanch": 5}
    for w, num in word_map.items():
        if f"{w} din pehle" in clean or f"{w} days ago" in clean or f"{w} dina hinde" in clean:
            return b_date - timedelta(days=num)

    # Never return a future date
    res = b_date
    return min(res, b_date)
