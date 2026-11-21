from __future__ import annotations
import pytest
from app.speech.number_words import rupees_in_words
from app.speech.stt import SttSession, SttError


def test_rupees_in_words_hi():
    assert rupees_in_words(100, "hi") == "एक रुपया"
    assert rupees_in_words(43000, "hi") == "चार सौ तीस रुपये"
    assert rupees_in_words(0, "hi") == "शून्य रुपये"
    assert rupees_in_words(12000000, "hi") == "एक लाख बीस हज़ार रुपये"
    assert rupees_in_words(34050, "hi") == "तीन सौ चालीस रुपये पचास पैसे"
    assert rupees_in_words(1000, "hi") == "दस रुपये"
    assert rupees_in_words(100000, "hi") == "एक हज़ार रुपये"


def test_rupees_in_words_en():
    assert rupees_in_words(100, "en") == "one rupee"
    assert rupees_in_words(43000, "en") == "four hundred thirty rupees"
    assert rupees_in_words(34050, "en") == "three hundred forty rupees and fifty paise"
    assert rupees_in_words(12000000, "en") == "one lakh twenty thousand rupees"


def test_rupees_in_words_kn():
    assert "ರೂಪಾಯಿ" in rupees_in_words(10000, "kn")
    assert "ರೂಪಾಯಿ" in rupees_in_words(43000, "kn")
    assert "ಪೈಸೆ" in rupees_in_words(34050, "kn")


def test_rupees_in_words_negative():
    with pytest.raises(ValueError):
        rupees_in_words(-100, "hi")


@pytest.mark.asyncio
async def test_stt_session_frame_validation():
    session = SttSession(lang_hints=["hi-IN"], keyterms=[])
    session.ws = None  # mock
    # Wrong frame size raises ValueError
    with pytest.raises(ValueError):
        await session.send(b"123")
