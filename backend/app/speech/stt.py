from __future__ import annotations
import asyncio
import json
import logging
import time
import websockets
import httpx
from app.core.config import get_settings
from app.schemas.contracts import Transcript

logger = logging.getLogger("stt")


class SttError(Exception):
    pass


class SttSession:
    def __init__(self, lang_hints: list[str], keyterms: list[str]):
        self.lang_hints = lang_hints
        self.keyterms = list(dict.fromkeys([k.strip() for k in keyterms if k.strip()]))[:200]
        self.ws = None
        self._open_time = None
        self._first_frame_time = None
        self._commit_time = None
        self._transcript_time = None
        self.closed = False

    async def open(self) -> None:
        settings = get_settings()
        self._open_time = time.time()

        headers = {
            "x-api-key": settings.GNANI_API_KEY,
            "x-model": settings.STT_MODEL,
            "x-language": ",".join(self.lang_hints),
            "x-format": settings.STT_FORMAT,
            "x-sample-rate": "16000",
            "x-min-silence-ms": str(settings.STT_MIN_SILENCE_MS),
            "x-vad-threshold": str(settings.STT_VAD_THRESHOLD),
        }
        if self.keyterms:
            headers["x-keyterms"] = ",".join(self.keyterms)

        url = "wss://api.gnani.ai/stt/v3.0/streaming"
        try:
            self.ws = await websockets.connect(url, extra_headers=headers)
            # Wait for "connected" message
            msg = await asyncio.wait_for(self.ws.recv(), timeout=3.0)
            data = json.loads(msg)
            if data.get("type") != "connected":
                raise SttError(f"Expected connected message, got: {data}")
        except Exception as e:
            await self.close()
            raise SttError(f"Failed to open STT session: {e}")

    async def send(self, frame: bytes) -> None:
        if len(frame) != 1024:
            raise ValueError(f"Frame must be exactly 1,024 bytes, got {len(frame)}")
        if self.ws is None or self.closed:
            raise SttError("STT session not open")
        if self._first_frame_time is None:
            self._first_frame_time = time.time()
        try:
            await self.ws.send(frame)
        except Exception as e:
            raise SttError(f"Failed to send frame: {e}")

    async def commit(self) -> None:
        if self.ws is None or self.closed:
            return
        self._commit_time = time.time()
        try:
            await self.ws.send(json.dumps({"type": "commit"}))
        except Exception as e:
            raise SttError(f"Failed to send commit frame: {e}")

    async def result(self, timeout: float = 6.0) -> Transcript:
        if self.ws is None:
            raise SttError("STT session not connected")

        t0 = time.time()
        segments = []
        detected_lang = None
        latency_val = None

        try:
            while True:
                time_left = timeout - (time.time() - t0)
                if time_left <= 0:
                    raise SttError("STT result timeout")

                msg = await asyncio.wait_for(self.ws.recv(), timeout=time_left)
                if isinstance(msg, bytes):
                    continue

                data = json.loads(msg)
                msg_type = data.get("type")
                if msg_type == "error":
                    raise SttError(data.get("message", "Gnani STT error"))

                if msg_type == "transcript":
                    text = data.get("text", "")
                    if text:
                        segments.append(text)
                    raw_lang = data.get("language")
                    if raw_lang:
                        detected_lang = raw_lang[:2].lower()
                    if "latency_ms" in data:
                        latency_val = data["latency_ms"]

                    if data.get("is_final", False):
                        break

            self._transcript_time = time.time()
            full_text = " ".join(segments).strip()
            # Log one line per utterance: open, first frame, commit and transcript timestamps (no audio, no keys)
            logger.info(
                f"STT utterance open={self._open_time} first_frame={self._first_frame_time} "
                f"commit={self._commit_time} transcript={self._transcript_time}"
            )

            # Map language to hi, kn or en
            lang_code = None
            if detected_lang in ("hi", "kn", "en"):
                lang_code = detected_lang

            return Transcript(text=full_text, language=lang_code, latency_ms=latency_val)

        except asyncio.TimeoutError:
            raise SttError("STT result timed out")
        except Exception as e:
            if isinstance(e, SttError):
                raise
            raise SttError(f"STT stream error: {e}")

    async def close(self) -> None:
        self.closed = True
        if self.ws is not None:
            try:
                await self.ws.close()
            except Exception:
                pass
            self.ws = None


async def transcribe_file(wav_bytes: bytes, lang_hints: list[str], keyterms: list[str]) -> Transcript:
    settings = get_settings()
    url = "https://api.gnani.ai/stt/v3.0/transcribe"
    headers = {"x-api-key": settings.GNANI_API_KEY}
    data = {
        "language": ",".join(lang_hints),
        "keyterms": ",".join(keyterms[:200]) if keyterms else "",
        "format": settings.STT_FORMAT,
    }
    files = {"audio": ("audio.wav", wav_bytes, "audio/wav")}

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            res = await client.post(url, headers=headers, data=data, files=files)
            if res.status_code != 200:
                raise SttError(f"Gnani REST STT error status {res.status_code}: {res.text}")
            res_json = res.json()
            raw_text = res_json.get("text", "")
            raw_lang = res_json.get("language")
            lang_code = raw_lang[:2].lower() if raw_lang in ("hi", "kn", "en", "hi-IN", "kn-IN", "en-IN") else None
            return Transcript(
                text=raw_text,
                language=lang_code,
                latency_ms=res_json.get("latency_ms")
            )
        except Exception as e:
            if isinstance(e, SttError):
                raise
            raise SttError(f"transcribe_file failed: {e}")
