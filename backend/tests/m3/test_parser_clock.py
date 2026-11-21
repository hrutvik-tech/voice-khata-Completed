from __future__ import annotations
import pytest
from datetime import datetime, date
try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo

from app.schemas.contracts import ShopInfo
from app.ai.number_parser import parse_amount
from app.ai.shop_clock import business_date, resolve_date


def test_parser_digits():
    assert parse_amount("340") == 34000
    assert parse_amount("3,400") == 340000
    assert parse_amount("1,20,000") == 12000000
    assert parse_amount("340.50") == 34050
    assert parse_amount("₹ 340") == 34000
    assert parse_amount("rs. 500") == 50000
    assert parse_amount("500 rupaye") == 50000
    assert parse_amount("४३०") == 43000
    assert parse_amount("೪೩೦") == 43000


def test_parser_hindi_words():
    assert parse_amount("teen sau chaalis") == 34000
    assert parse_amount("char sau tees") == 43000
    assert parse_amount("चार सौ तीस") == 43000
    assert parse_amount("एक लाख बीस हज़ार") == 12000000
    assert parse_amount("ek sau") == 10000
    assert parse_amount("pachpan") == 5500
    assert parse_amount("ninyanve") == 9900


def test_parser_hindi_fractions():
    # saade teen sau = 350
    assert parse_amount("saade teen sau") == 35000
    assert parse_amount("saadhe teen sau") == 35000
    # dedh hazaar = 1500
    assert parse_amount("dedh hazaar") == 150000
    # dhai sau = 250
    assert parse_amount("dhai sau") == 25000
    # sawa sau = 125
    assert parse_amount("sawa sau") == 12500
    # paune teen sau = 275
    assert parse_amount("paune teen sau") == 27500


def test_parser_english_words():
    assert parse_amount("one hundred") == 10000
    assert parse_amount("four hundred thirty") == 43000
    assert parse_amount("one lakh twenty thousand") == 12000000
    assert parse_amount("fifty") == 5000


def test_parser_kannada_words():
    assert parse_amount("nooru") == 10000
    assert parse_amount("naalku nooru") == 40000
    assert parse_amount("saavira") == 100000
    assert parse_amount("ಒಂದು ನೂರು") == 10000


def test_parser_spoken_shorthand():
    assert parse_amount("three forty") == 34000
    assert parse_amount("four thirty") == 43000
    assert parse_amount("teen chaalis") == 34000
    assert parse_amount("char tees") == 43000


def test_parser_paise_and_edge_cases():
    assert parse_amount("340 rupees and 50 paise") == 34050
    assert parse_amount("kal mausam achha tha") is None
    assert parse_amount("0") is None
    assert parse_amount("zero") is None
    assert parse_amount("shunya") is None

    with pytest.raises(ValueError):
        parse_amount("-500")


def test_shop_clock_business_date():
    tz = ZoneInfo("Asia/Kolkata")
    shop = ShopInfo(
        shop_id=1,
        open_time="06:00",
        close_time="02:00",
        timezone="Asia/Kolkata",
        language_mode="mix",
    )

    # 21 Nov 19:00 -> 21 Nov
    dt1 = datetime(2026, 11, 21, 19, 0, tzinfo=tz)
    assert business_date(dt1, shop) == date(2026, 11, 21)

    # 22 Nov 01:05 -> 21 Nov
    dt2 = datetime(2026, 11, 22, 1, 5, tzinfo=tz)
    assert business_date(dt2, shop) == date(2026, 11, 21)

    # 22 Nov 05:59 -> 21 Nov
    dt3 = datetime(2026, 11, 22, 5, 59, tzinfo=tz)
    assert business_date(dt3, shop) == date(2026, 11, 21)

    # 22 Nov 06:00 -> 22 Nov
    dt4 = datetime(2026, 11, 22, 6, 0, tzinfo=tz)
    assert business_date(dt4, shop) == date(2026, 11, 22)


def test_shop_clock_resolve_date():
    tz = ZoneInfo("Asia/Kolkata")
    shop = ShopInfo(
        shop_id=1,
        open_time="06:00",
        close_time="02:00",
        timezone="Asia/Kolkata",
        language_mode="mix",
    )

    dt = datetime(2026, 11, 21, 19, 0, tzinfo=tz)
    # Today words
    assert resolve_date(None, dt, shop) == date(2026, 11, 21)
    assert resolve_date("aaj", dt, shop) == date(2026, 11, 21)
    assert resolve_date("today", dt, shop) == date(2026, 11, 21)
    assert resolve_date("ivattu", dt, shop) == date(2026, 11, 21)

    # Yesterday words
    assert resolve_date("kal", dt, shop) == date(2026, 11, 20)
    assert resolve_date("yesterday", dt, shop) == date(2026, 11, 20)
    assert resolve_date("ninne", dt, shop) == date(2026, 11, 20)

    # Day before yesterday
    assert resolve_date("parso", dt, shop) == date(2026, 11, 19)
    assert resolve_date("monne", dt, shop) == date(2026, 11, 19)

    # N days ago
    assert resolve_date("3 din pehle", dt, shop) == date(2026, 11, 18)
    assert resolve_date("5 days ago", dt, shop) == date(2026, 11, 16)

    # Critical requirement: "kal" at 22 Nov 01:05 -> 20 Nov
    late_dt = datetime(2026, 11, 22, 1, 5, tzinfo=tz)
    assert resolve_date("kal", late_dt, shop) == date(2026, 11, 20)
