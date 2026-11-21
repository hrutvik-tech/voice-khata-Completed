from __future__ import annotations
from types import SimpleNamespace
from app.core.config import get_settings


def speech() -> SimpleNamespace:
    settings = get_settings()
    if settings.USE_STUB_SPEECH:
        from app.speech import stub
        return SimpleNamespace(
            SttSession=stub.SttSession,
            transcribe_file=stub.transcribe_file,
            synthesize=stub.synthesize,
        )
    else:
        from app.speech import stt, tts
        return SimpleNamespace(
            SttSession=stt.SttSession,
            transcribe_file=stt.transcribe_file,
            synthesize=tts.synthesize,
        )


def ai() -> SimpleNamespace:
    settings = get_settings()
    if settings.USE_STUB_AI:
        from app.ai import stub
        return SimpleNamespace(
            interpret=stub.interpret,
            parse_amount=stub.parse_amount,
            business_date=stub.business_date,
            resolve_date=stub.resolve_date,
            normalize_name=stub.normalize_name,
            match_customers=stub.match_customers,
        )
    else:
        from app.ai import interpreter, number_parser, shop_clock, matching
        return SimpleNamespace(
            interpret=interpreter.interpret,
            parse_amount=number_parser.parse_amount,
            business_date=shop_clock.business_date,
            resolve_date=shop_clock.resolve_date,
            normalize_name=matching.normalize_name,
            match_customers=matching.match_customers,
        )
