from __future__ import annotations
import asyncio
import json
import logging
import time
from datetime import datetime, timezone
try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.tokens import decode_token
from app.db.session import SessionLocal
from app.db.models import Shop
from app.schemas.contracts import Transcript
from app.services import providers, ledger, replies
from app.services.conversation import get_or_create_session, is_turn_id_seen
from app.services.orchestrator import handle_transcript, handle_choice

logger = logging.getLogger("ws")
router = APIRouter(tags=["ws"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str | None = None):
    await websocket.accept()

    # Authenticate token
    if not token:
        await websocket.send_json({
            "type": "error",
            "turn_id": "",
            "code": "unauthorized",
            "say": "Unauthorized access",
        })
        await websocket.close(code=4401)
        return

    try:
        payload = decode_token(token)
        shop_id = int(payload["shop_id"])
    except Exception:
        await websocket.send_json({
            "type": "error",
            "turn_id": "",
            "code": "unauthorized",
            "say": "Unauthorized access",
        })
        await websocket.close(code=4401)
        return

    db: Session = SessionLocal()
    try:
        shop = db.query(Shop).filter(Shop.id == shop_id).first()
        if not shop:
            await websocket.send_json({
                "type": "error",
                "turn_id": "",
                "code": "unauthorized",
                "say": "Shop not found",
            })
            await websocket.close(code=4401)
            return

        now = datetime.now(timezone.utc)
        session = get_or_create_session(db, shop.id, now)
        session_id = session.id
    finally:
        db.close()

    # Ready & initial state
    await websocket.send_json({"type": "ready", "session_id": session_id, "shop_id": shop_id})
    await websocket.send_json({"type": "state", "state": "resting"})

    stt_session = None
    current_turn_id = None
    turn_now = None
    is_turn_active = False

    try:
        while True:
            message = await websocket.receive()
            if "bytes" in message and message["bytes"] is not None:
                frame: bytes = message["bytes"]
                if not is_turn_active or stt_session is None:
                    continue
                if len(frame) != 1024:
                    await websocket.send_json({
                        "type": "error",
                        "turn_id": current_turn_id or "",
                        "code": "bad_message",
                        "say": "Audio frame must be 1,024 bytes",
                    })
                    continue
                try:
                    await stt_session.send(frame)
                except Exception as e:
                    logger.warning(f"Error sending frame to STT: {e}")

            elif "text" in message and message["text"] is not None:
                text_data = message["text"]
                try:
                    data = json.loads(text_data)
                except Exception:
                    await websocket.send_json({
                        "type": "error",
                        "turn_id": current_turn_id or "",
                        "code": "bad_message",
                        "say": "Invalid JSON frame",
                    })
                    continue

                msg_type = data.get("type")

                if msg_type == "ping":
                    await websocket.send_json({"type": "pong"})
                    continue

                if msg_type == "turn_start":
                    if is_turn_active:
                        # Ignore turn_start received during a turn
                        continue

                    turn_id = data.get("turn_id")
                    if is_turn_id_seen(session_id, turn_id):
                        # Repeated turn_id ignored
                        continue

                    current_turn_id = turn_id
                    is_turn_active = True

                    settings = get_settings()
                    now_override = data.get("now_override")
                    if settings.DEBUG and now_override:
                        try:
                            turn_now = datetime.fromisoformat(now_override)
                            if turn_now.tzinfo is None:
                                turn_now = turn_now.replace(tzinfo=ZoneInfo("Asia/Kolkata"))
                        except Exception:
                            turn_now = datetime.now(timezone.utc)
                    else:
                        turn_now = datetime.now(timezone.utc)

                    # Language hints based on shop mode
                    lang_hints = ["hi-IN", "kn-IN", "en-IN"]
                    if shop.language_mode == "hi":
                        lang_hints = ["hi-IN", "en-IN"]
                    elif shop.language_mode == "kn":
                        lang_hints = ["kn-IN", "en-IN"]
                    elif shop.language_mode == "en":
                        lang_hints = ["en-IN"]

                    # Up to 200 customer names
                    db_sess = SessionLocal()
                    try:
                        c_refs = ledger.customer_refs(db_sess, shop_id, turn_now)
                        keyterms = [c.name for c in c_refs][:200]
                    finally:
                        db_sess.close()

                    stt_mod = providers.speech()
                    stt_session = stt_mod.SttSession(lang_hints=lang_hints, keyterms=keyterms)
                    try:
                        await stt_session.open()
                        await websocket.send_json({"type": "state", "state": "listening"})
                    except Exception as e:
                        logger.error(f"Failed to open STT: {e}")
                        is_turn_active = False
                        stt_session = None
                        await websocket.send_json({
                            "type": "error",
                            "turn_id": current_turn_id,
                            "code": "stt_failed",
                            "say": replies.render("stt_failed", "hi"),
                        })
                        await websocket.send_json({"type": "state", "state": "resting"})

                elif msg_type == "commit":
                    if not is_turn_active or stt_session is None:
                        continue

                    commit_ts = time.perf_counter()
                    await websocket.send_json({"type": "state", "state": "understanding"})

                    try:
                        await stt_session.commit()
                        transcript = await stt_session.result()
                    except Exception as e:
                        logger.warning(f"STT result failed: {e}")
                        await websocket.send_json({
                            "type": "error",
                            "turn_id": current_turn_id,
                            "code": "stt_failed",
                            "say": replies.render("stt_failed", "hi"),
                        })
                        if stt_session:
                            await stt_session.close()
                        stt_session = None
                        is_turn_active = False
                        await websocket.send_json({"type": "state", "state": "resting"})
                        continue

                    finally:
                        if stt_session:
                            await stt_session.close()
                            stt_session = None

                    heard_ts = time.perf_counter()
                    commit_to_heard_ms = int((heard_ts - commit_ts) * 1000)

                    if not transcript.text.strip():
                        say_text = replies.render("not_understood", "hi")
                        await websocket.send_json({
                            "type": "not_understood",
                            "turn_id": current_turn_id,
                            "say": say_text,
                        })
                        await _speak_and_finish(websocket, current_turn_id, say_text, "hi", False)
                        is_turn_active = False
                        continue

                    # Send heard
                    heard_lang = transcript.language or ("hi" if shop.language_mode == "mix" else shop.language_mode)
                    await websocket.send_json({
                        "type": "heard",
                        "turn_id": current_turn_id,
                        "text": transcript.text,
                        "language": heard_lang,
                    })

                    # Handle transcript via orchestrator
                    try:
                        events = await handle_transcript(
                            session_id=session_id,
                            turn_id=current_turn_id,
                            transcript=transcript,
                            now=turn_now or datetime.now(timezone.utc),
                            source="voice",
                            strict=False,
                        )
                    except Exception as e:
                        logger.error(f"Orchestrator error: {e}", exc_info=True)
                        say_text = replies.render("not_understood", heard_lang)
                        await websocket.send_json({
                            "type": "error",
                            "turn_id": current_turn_id,
                            "code": "llm_failed",
                            "say": say_text,
                        })
                        await websocket.send_json({"type": "state", "state": "resting"})
                        is_turn_active = False
                        continue

                    msg_ts = time.perf_counter()
                    heard_to_msg_ms = int((msg_ts - heard_ts) * 1000)

                    # Send orchestrator events
                    for ev in events:
                        await websocket.send_json(ev)

                    # Final speaking & state
                    final_ev = events[-1] if events else None
                    final_say = final_ev.get("say") if final_ev else None
                    is_question = (final_ev.get("type") == "question") if final_ev else False

                    logger.info(f"turn {current_turn_id} commit->heard: {commit_to_heard_ms}ms, heard->msg: {heard_to_msg_ms}ms")

                    if final_say:
                        await _speak_and_finish(websocket, current_turn_id, final_say, heard_lang, is_question)
                    else:
                        target_state = "asking" if is_question else "resting"
                        await websocket.send_json({"type": "state", "state": target_state})

                    is_turn_active = False

                elif msg_type == "cancel":
                    if stt_session:
                        await stt_session.close()
                        stt_session = None
                    is_turn_active = False
                    await websocket.send_json({"type": "state", "state": "resting"})

                elif msg_type == "choose":
                    choice_turn_id = data.get("turn_id", current_turn_id or "")
                    choice_payload = data.get("choice", {})
                    c_now = turn_now or datetime.now(timezone.utc)

                    events = await handle_choice(
                        session_id=session_id,
                        turn_id=choice_turn_id,
                        choice=choice_payload,
                        now=c_now,
                    )
                    for ev in events:
                        await websocket.send_json(ev)

                    final_ev = events[-1] if events else None
                    final_say = final_ev.get("say") if final_ev else None
                    is_question = (final_ev.get("type") == "question") if final_ev else False

                    c_lang = "hi" if shop.language_mode == "mix" else shop.language_mode
                    if final_say:
                        await _speak_and_finish(websocket, choice_turn_id, final_say, c_lang, is_question)
                    else:
                        target_state = "asking" if is_question else "resting"
                        await websocket.send_json({"type": "state", "state": target_state})

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for shop {shop_id}")
    finally:
        if stt_session:
            await stt_session.close()


async def _speak_and_finish(websocket: WebSocket, turn_id: str, say_text: str, language: str, is_question: bool):
    await websocket.send_json({"type": "state", "state": "speaking"})
    await websocket.send_json({"type": "audio_start", "turn_id": turn_id, "format": "mp3"})

    speech_mod = providers.speech()
    t0 = time.perf_counter()
    first_logged = False
    try:
        async for chunk in speech_mod.synthesize(say_text, language):
            if not first_logged:
                first_logged = True
                audio_lat_ms = int((time.perf_counter() - t0) * 1000)
                logger.info(f"turn {turn_id} final->first audio chunk: {audio_lat_ms}ms")
            await websocket.send_bytes(chunk)
    except Exception as e:
        logger.warning(f"TTS synthesis failed: {e}")

    await websocket.send_json({"type": "audio_end", "turn_id": turn_id})
    target_state = "asking" if is_question else "resting"
    await websocket.send_json({"type": "state", "state": target_state})
