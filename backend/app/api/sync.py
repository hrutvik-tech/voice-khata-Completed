from __future__ import annotations
import struct
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Shop
from app.core.tokens import current_shop
from app.services import providers, ledger
from app.services.conversation import get_or_create_session
from app.services.orchestrator import handle_transcript

router = APIRouter(prefix="/sync", tags=["sync"])


def _validate_wav(data: bytes):
    if len(data) < 44 or not data.startswith(b"RIFF") or data[8:12] != b"WAVE":
        raise HTTPException(status_code=422, detail="Audio must be a valid WAV file")

    try:
        # Locate fmt chunk
        idx = 12
        fmt_found = False
        while idx < len(data) - 8:
            chunk_id = data[idx:idx+4]
            chunk_size = struct.unpack("<I", data[idx+4:idx+8])[0]
            if chunk_id == b"fmt ":
                fmt_data = data[idx+8:idx+8+chunk_size]
                audio_format, num_channels, sample_rate = struct.unpack("<HHI", fmt_data[:8])
                bits_per_sample = struct.unpack("<H", fmt_data[14:16])[0]
                if audio_format != 1 or num_channels != 1 or sample_rate != 16000 or bits_per_sample != 16:
                    raise HTTPException(status_code=422, detail="Audio must be 16 kHz mono 16-bit PCM WAV")
                fmt_found = True
                break
            idx += 8 + chunk_size
        if not fmt_found:
            raise HTTPException(status_code=422, detail="Invalid WAV format chunk")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=422, detail="Audio must be 16 kHz mono 16-bit PCM WAV")


@router.post("/audio")
async def sync_audio(
    audio: UploadFile = File(...),
    idempotency_key: str = Form(...),
    recorded_at: str = Form(...),
    shop: Shop = Depends(current_shop),
    db: Session = Depends(get_db),
):
    audio_bytes = await audio.read()
    _validate_wav(audio_bytes)

    try:
        dt = datetime.fromisoformat(recorded_at)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid recorded_at ISO timestamp")

    # Transcribe
    c_refs = ledger.customer_refs(db, shop.id, dt)
    cust_names = [c.name for c in c_refs]
    lang_hints = ["hi-IN", "kn-IN", "en-IN"]

    transcript = await providers.speech().transcribe_file(audio_bytes, lang_hints, cust_names)

    session = get_or_create_session(db, shop.id, dt)
    raw_events = await handle_transcript(
        session_id=session.id,
        turn_id=idempotency_key,
        transcript=transcript,
        now=dt,
        source="offline",
        strict=True,
    )

    # Prepend heard event
    heard_event = {
        "type": "heard",
        "turn_id": idempotency_key,
        "text": transcript.text,
        "language": transcript.language or "hi",
    }
    all_events = [heard_event] + raw_events

    return {"turn_id": idempotency_key, "events": all_events}
