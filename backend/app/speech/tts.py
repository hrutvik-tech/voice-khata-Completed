from __future__ import annotations
import asyncio
import json
import logging
import time
from typing import AsyncIterator
import websockets
from app.core.config import get_settings
from app.schemas.contracts import Lang

logger = logging.getLogger("tts")


class TtsError(Exception):
    pass


async def synthesize(text: str, language: Lang) -> AsyncIterator[bytes]:
    settings = get_settings()
    headers = {
        "x-api-key": settings.GNANI_API_KEY,
        "x-model": settings.TTS_MODEL,
        "x-voice": settings.TTS_VOICE or ("priya_hi" if language == "hi" else ("ananya_kn" if language == "kn" else "arun_en")),
        "x-container": settings.TTS_CONTAINER,
        "x-sample-rate": "16000",
    }
    url = "wss://api.gnani.ai/tts/v3.0/streaming"
    t0 = time.time()
    first_chunk_logged = False

    try:
        async with websockets.connect(url, extra_headers=headers) as ws:
            req = {"action": "synthesize", "text": text, "language": language}
            await ws.send(json.dumps(req))

            while True:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=10.0)
                except asyncio.TimeoutError:
                    raise TtsError("TTS synthesis timeout")

                if isinstance(msg, bytes):
                    if not first_chunk_logged:
                        first_chunk_logged = True
                        duration_ms = int((time.time() - t0) * 1000)
                        logger.info(f"TTS time to first chunk: {duration_ms} ms")
                    yield msg
                else:
                    data = json.loads(msg)
                    if data.get("type") == "error":
                        raise TtsError(data.get("message", "Gnani TTS error"))
                    if data.get("type") in ("done", "completed"):
                        break
    except Exception as e:
        if isinstance(e, TtsError):
            raise
        raise TtsError(f"TTS connection failed: {e}")
