from __future__ import annotations
import asyncio
import sys
from datetime import datetime, timedelta, timezone
from app.core.config import get_settings


def purge(now: datetime | None = None, clear_all: bool = False) -> dict:
    from app.db.session import SessionLocal
    from app.db.models import Transaction, ConversationSession

    if now is None:
        now = datetime.now(timezone.utc)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    settings = get_settings()
    cutoff = now - timedelta(hours=settings.TRANSCRIPT_RETENTION_HOURS)

    db = SessionLocal()
    try:
        if clear_all:
            q = db.query(Transaction).filter(Transaction.raw_transcript.isnot(None))
            cleared_count = q.count()
            q.update({Transaction.raw_transcript: None}, synchronize_session=False)
        else:
            q = db.query(Transaction).filter(
                Transaction.raw_transcript.isnot(None),
                Transaction.recorded_at < cutoff
            )
            cleared_count = q.count()
            q.update({Transaction.raw_transcript: None}, synchronize_session=False)

        # Delete expired sessions
        sess_q = db.query(ConversationSession).filter(ConversationSession.expires_at < now)
        deleted_sessions = sess_q.count()
        sess_q.delete(synchronize_session=False)

        db.commit()
        return {"transcripts_cleared": cleared_count, "sessions_deleted": deleted_sessions}
    finally:
        db.close()


async def retention_loop() -> None:
    while True:
        try:
            purge()
        except Exception:
            pass
        await asyncio.sleep(3600)


if __name__ == "__main__":
    if "--all" in sys.argv:
        res = purge(clear_all=True)
        print(f"Purged all transcripts: {res}")
    else:
        res = purge()
        print(f"Purge completed: {res}")
