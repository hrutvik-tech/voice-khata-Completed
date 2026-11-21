from __future__ import annotations
import uuid
from datetime import datetime, timezone
try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.tokens import current_shop
from app.db.session import get_db
from app.db.models import Shop
from app.db.seed import seed_demo
from app.schemas.contracts import Transcript
from app.services.conversation import get_or_create_session
from app.services.orchestrator import handle_transcript, handle_choice

router = APIRouter(prefix="/debug", tags=["debug"])


class DebugTurnRequest(BaseModel):
    text: str
    now: str | None = None
    session_id: str | None = None


class DebugChooseRequest(BaseModel):
    session_id: str
    turn_id: str
    choice: dict
    now: str | None = None


class DebugResetRequest(BaseModel):
    now: str | None = None


def _parse_now(now_str: str | None) -> datetime:
    if not now_str:
        return datetime.now(timezone.utc)
    try:
        dt = datetime.fromisoformat(now_str)
        if dt.tzinfo is None:
            # Default to Asia/Kolkata if naive
            kolkata = ZoneInfo("Asia/Kolkata")
            dt = dt.replace(tzinfo=kolkata)
        return dt
    except Exception:
        return datetime.now(timezone.utc)


@router.post("/turn")
async def debug_turn(
    req: DebugTurnRequest,
    shop: Shop = Depends(current_shop),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    if not settings.DEBUG:
        raise HTTPException(status_code=404, detail="Not found")

    now = _parse_now(req.now)
    if req.session_id:
        from app.db.models import ConversationSession
        session = db.query(ConversationSession).filter(ConversationSession.id == req.session_id).first()
        if not session:
            session = get_or_create_session(db, shop.id, now)
    else:
        session = get_or_create_session(db, shop.id, now)

    turn_id = str(uuid.uuid4())
    transcript = Transcript(text=req.text)

    events = await handle_transcript(
        session_id=session.id,
        turn_id=turn_id,
        transcript=transcript,
        now=now,
        source="voice",
        strict=False,
    )

    heard_event = {
        "type": "heard",
        "turn_id": turn_id,
        "text": req.text,
        "language": session.last_language or "hi",
    }
    all_events = [heard_event] + events
    return {
        "session_id": session.id,
        "turn_id": turn_id,
        "events": all_events,
    }


@router.post("/choose")
async def debug_choose(
    req: DebugChooseRequest,
    shop: Shop = Depends(current_shop),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    if not settings.DEBUG:
        raise HTTPException(status_code=404, detail="Not found")

    now = _parse_now(req.now)
    events = await handle_choice(
        session_id=req.session_id,
        turn_id=req.turn_id,
        choice=req.choice,
        now=now,
    )
    return {"events": events}


@router.post("/reset", status_code=204)
def debug_reset(
    req: DebugResetRequest,
    shop: Shop = Depends(current_shop),
):
    settings = get_settings()
    if not settings.DEBUG:
        raise HTTPException(status_code=404, detail="Not found")

    now = _parse_now(req.now) if req.now else None
    seed_demo(now=now)
    return None
