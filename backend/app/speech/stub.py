from __future__ import annotations
from typing import AsyncIterator
from app.core.config import get_settings
from app.schemas.contracts import Transcript, Lang


class SttSession:
    def __init__(self, lang_hints: list[str], keyterms: list[str]):
        self.lang_hints = lang_hints
        self.keyterms = keyterms
        self.is_open = False
        self.is_committed = False

    async def open(self) -> None:
        self.is_open = True

    async def send(self, frame: bytes) -> None:
        if len(frame) != 1024:
            raise ValueError(f"Frame must be exactly 1024 bytes, got {len(frame)}")

    async def commit(self) -> None:
        self.is_committed = True

    async def result(self, timeout: float = 6.0) -> Transcript:
        settings = get_settings()
        return Transcript(
            text=settings.STUB_TRANSCRIPT,
            language="hi",
            latency_ms=10
        )

    async def close(self) -> None:
        self.is_open = False


async def transcribe_file(wav_bytes: bytes, lang_hints: list[str], keyterms: list[str]) -> Transcript:
    settings = get_settings()
    return Transcript(
        text=settings.STUB_TRANSCRIPT,
        language="hi",
        latency_ms=10
    )


async def synthesize(text: str, language: Lang) -> AsyncIterator[bytes]:
    # Yield empty / dummy audio data
    yield b"\xff\xfb\x90d\x00\x00\x00\x00"
