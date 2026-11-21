from __future__ import annotations
import json
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.db.models import ConversationSession

# In-memory recent turn_ids per session for deduplication
_recent_turn_ids: dict[str, list[str]] = {}


def get_or_create_session(db: Session, shop_id: int, now: datetime) -> ConversationSession:
    if now.tzinfo is None:
        now_utc = now.replace(tzinfo=timezone.utc)
    else:
        now_utc = now.astimezone(timezone.utc)
    # Store as naive UTC for SQLite consistency
    now_naive = now_utc.replace(tzinfo=None)
    expires_naive = now_naive + timedelta(minutes=30)

    session = db.query(ConversationSession).filter(
        ConversationSession.shop_id == shop_id,
        ConversationSession.expires_at > now_naive
    ).order_by(ConversationSession.updated_at.desc()).first()

    if not session:
        session_id = str(uuid.uuid4())
        session = ConversationSession(
            id=session_id,
            shop_id=shop_id,
            state="resting",
            disclosed=False,
            expires_at=expires_naive,
            updated_at=now_naive,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
    else:
        session.expires_at = expires_naive
        session.updated_at = now_naive
        db.commit()
        db.refresh(session)

    return session


def set_session_state(db: Session, session: ConversationSession, state: str):
    session.state = state
    db.commit()
    db.refresh(session)


def set_last_entry(db: Session, session: ConversationSession, txn_id: int, txn_at: datetime):
    if txn_at.tzinfo is None:
        txn_at = txn_at.replace(tzinfo=timezone.utc)
    else:
        txn_at = txn_at.astimezone(timezone.utc)
    # Store as naive UTC so SQLite reads it back consistently
    session.last_txn_id = txn_id
    session.last_txn_at = txn_at.replace(tzinfo=None)
    db.commit()
    db.refresh(session)


def set_pending(
    db: Session,
    session: ConversationSession,
    pending_question: dict,
    remaining_ops: list[dict],
):
    data = {
        "question": pending_question,
        "remaining_ops": remaining_ops,
    }
    session.pending_json = json.dumps(data)
    db.commit()
    db.refresh(session)


def get_pending(session: ConversationSession) -> tuple[dict | None, list[dict]]:
    if not session.pending_json:
        return None, []
    try:
        data = json.loads(session.pending_json)
        return data.get("question"), data.get("remaining_ops", [])
    except Exception:
        return None, []


def clear_pending(db: Session, session: ConversationSession):
    session.pending_json = None
    db.commit()
    db.refresh(session)


def mark_disclosed(db: Session, session: ConversationSession):
    session.disclosed = True
    db.commit()
    db.refresh(session)


def is_turn_id_seen(session_id: str, turn_id: str) -> bool:
    if session_id not in _recent_turn_ids:
        _recent_turn_ids[session_id] = []
    seen = _recent_turn_ids[session_id]
    if turn_id in seen:
        return True
    seen.append(turn_id)
    if len(seen) > 50:
        seen.pop(0)
    return False
