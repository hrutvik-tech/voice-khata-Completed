from __future__ import annotations
import json
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import Shop, Customer, Transaction, ConversationSession
from app.schemas.contracts import (
    Transcript,
    Context,
    ShopInfo,
    CustomerRef,
    EntryRef,
    PendingQuestion,
    Operation,
    Interpretation,
    Lang,
)
from app.services import providers, ledger, conversation, replies, validation


def _get_shop_info(shop: Shop) -> ShopInfo:
    return ShopInfo(
        shop_id=shop.id,
        open_time=shop.open_time,
        close_time=shop.close_time,
        timezone=shop.timezone,
        language_mode=shop.language_mode,
    )


def _get_last_entry_ref(db: Session, session: ConversationSession) -> EntryRef | None:
    if not session.last_txn_id:
        return None
    txn = db.query(Transaction).filter(Transaction.id == session.last_txn_id).first()
    if not txn or txn.status != "active":
        return None
    cust = db.query(Customer).filter(Customer.id == txn.customer_id).first()
    cust_name = cust.name if cust else ""
    return EntryRef(
        id=txn.id,
        customer_id=txn.customer_id,
        customer_name=cust_name,
        amount_paise=txn.amount_paise,
        direction=txn.direction,
        recorded_at=txn.recorded_at,
    )


async def handle_transcript(
    session_id: str,
    turn_id: str,
    transcript: Transcript,
    now: datetime,
    source: str = "voice",
    strict: bool = False,
) -> list[dict]:
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    db: Session = SessionLocal()
    try:
        session = db.query(ConversationSession).filter(ConversationSession.id == session_id).first()
        if not session:
            raise ValueError(f"Session {session_id} not found")

        shop = db.query(Shop).filter(Shop.id == session.shop_id).first()
        if not shop:
            raise ValueError(f"Shop {session.shop_id} not found")

        # Build context
        shop_info = _get_shop_info(shop)
        c_refs = ledger.customer_refs(db, shop.id, now)
        last_entry_ref = _get_last_entry_ref(db, session)

        pending_q_data, _ = conversation.get_pending(session)
        pending_q = None
        if pending_q_data:
            pending_q = PendingQuestion(
                kind=pending_q_data["kind"],
                turn_id=pending_q_data["turn_id"],
                options=pending_q_data.get("options", []),
                about=pending_q_data.get("about", {}),
            )

        context = Context(
            shop=shop_info,
            customers=c_refs,
            last_entry=last_entry_ref,
            pending_question=pending_q,
            now=now,
        )

        ai_mod = providers.ai()
        interpretation = await ai_mod.interpret(transcript, context)

        # Rule 8: If a question is pending and user speaks new unrelated speech (not CONFIRM/CHOOSE_CUSTOMER)
        first_op = interpretation.operations[0] if interpretation.operations else None
        if pending_q and first_op and first_op.intent not in ("CONFIRM", "CHOOSE_CUSTOMER"):
            conversation.clear_pending(db, session)
            pending_q = None
            context.pending_question = None

        return await _process_operations(
            db=db,
            session=session,
            shop=shop,
            turn_id=turn_id,
            operations=interpretation.operations,
            transcript=transcript,
            language=interpretation.language,
            now=now,
            source=source,
            strict=strict,
        )
    finally:
        db.close()


async def handle_choice(
    session_id: str,
    turn_id: str,
    choice: dict,
    now: datetime,
) -> list[dict]:
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    db: Session = SessionLocal()
    try:
        session = db.query(ConversationSession).filter(ConversationSession.id == session_id).first()
        if not session:
            raise ValueError(f"Session {session_id} not found")

        shop = db.query(Shop).filter(Shop.id == session.shop_id).first()
        pending_q_data, remaining_ops_data = conversation.get_pending(session)
        conversation.clear_pending(db, session)

        if not pending_q_data:
            say_text = replies.render("not_understood", "hi")
            return [{"type": "not_understood", "turn_id": turn_id, "say": say_text}]

        kind = pending_q_data["kind"]
        about = pending_q_data.get("about", {})
        language = session.last_language or "hi"
        if language == "mix":
            language = "hi"

        # Resolve question kind
        if kind == "choose_customer":
            # choice: {"customer_id": 2}
            chosen_id = choice.get("customer_id")
            if not chosen_id:
                say_text = replies.render("not_understood", language)
                return [{"type": "not_understood", "turn_id": turn_id, "say": say_text}]

            # Resume about operation
            op_data = about.get("operation")
            if op_data:
                target_cust = db.query(Customer).filter(Customer.id == chosen_id).first()
                if not target_cust:
                    say_text = replies.render("not_understood", language)
                    return [{"type": "not_understood", "turn_id": turn_id, "say": say_text}]

                # If query balance
                if op_data.get("intent") == "QUERY_BALANCE":
                    bal = ledger.customer_balance(db, target_cust.id)
                    key = "balance_zero" if bal == 0 else ("balance_advance" if bal < 0 else "balance")
                    say_text = replies.render(key, language, name=target_cust.name, balance=bal)
                    ans_data = {
                        "customer_id": target_cust.id,
                        "customer_name": target_cust.name,
                        "balance_paise": bal,
                    }
                    return [{"type": "answer", "turn_id": turn_id, "kind": "balance", "say": say_text, "data": ans_data}]

                # If create transaction
                op_data["customer_id"] = target_cust.id
                op_data["customer_name"] = target_cust.name
                op_data["resolved"] = True
                ops_to_resume = [Operation.model_validate(op_data)] + [Operation.model_validate(o) for o in remaining_ops_data]
                return await _process_operations(
                    db=db,
                    session=session,
                    shop=shop,
                    turn_id=turn_id,
                    operations=ops_to_resume,
                    transcript=Transcript(text=""),
                    language=language,
                    now=now,
                    source="voice",
                    strict=False,
                )

        elif kind in ("confirm_duplicate", "confirm_amount", "confirm_amend", "confirm_undo", "confirm_similar"):
            ans = choice.get("answer")
            if ans == "no":
                if kind == "confirm_similar":
                    # Create new customer
                    op_data = about.get("operation", {})
                    c_name = op_data.get("customer_name")
                    new_cust = ledger.create_customer(db, shop.id, c_name, None, None, source="voice")
                    op_data["customer_id"] = new_cust.id
                    op_data["customer_name"] = new_cust.name
                    op_data["new_customer"] = True
                    op_data["resolved"] = True
                    ops_to_resume = [Operation.model_validate(op_data)] + [Operation.model_validate(o) for o in remaining_ops_data]
                    return await _process_operations(
                        db=db,
                        session=session,
                        shop=shop,
                        turn_id=turn_id,
                        operations=ops_to_resume,
                        transcript=Transcript(text=""),
                        language=language,
                        now=now,
                        source="voice",
                        strict=False,
                    )
                else:
                    say_text = replies.render("cancelled", language)
                    return [{"type": "answer", "turn_id": turn_id, "kind": "cancelled", "say": say_text, "data": {}}]

            elif ans == "yes":
                op_data = about.get("operation", {})
                op_data["bypass_duplicate"] = True
                op_data["bypass_amount_check"] = True
                op_data["bypass_window_check"] = True
                if kind == "confirm_similar":
                    cand_id = about.get("candidate_id")
                    target_cust = db.query(Customer).filter(Customer.id == cand_id).first()
                    op_data["customer_id"] = target_cust.id
                    op_data["customer_name"] = target_cust.name
                    op_data["resolved"] = True

                ops_to_resume = [Operation.model_validate(op_data)] + [Operation.model_validate(o) for o in remaining_ops_data]
                return await _process_operations(
                    db=db,
                    session=session,
                    shop=shop,
                    turn_id=turn_id,
                    operations=ops_to_resume,
                    transcript=Transcript(text=""),
                    language=language,
                    now=now,
                    source="voice",
                    strict=False,
                )

        elif kind == "confirm_direction":
            ans = choice.get("answer")  # "credit" or "payment"
            if ans in ("credit", "payment"):
                op_data = about.get("operation", {})
                op_data["direction"] = ans
                ops_to_resume = [Operation.model_validate(op_data)] + [Operation.model_validate(o) for o in remaining_ops_data]
                return await _process_operations(
                    db=db,
                    session=session,
                    shop=shop,
                    turn_id=turn_id,
                    operations=ops_to_resume,
                    transcript=Transcript(text=""),
                    language=language,
                    now=now,
                    source="voice",
                    strict=False,
                )

        say_text = replies.render("not_understood", language)
        return [{"type": "not_understood", "turn_id": turn_id, "say": say_text}]
    finally:
        db.close()


async def _process_operations(
    db: Session,
    session: ConversationSession,
    shop: Shop,
    turn_id: str,
    operations: list[Operation],
    transcript: Transcript,
    language: Lang,
    now: datetime,
    source: str,
    strict: bool,
) -> list[dict]:
    messages: list[dict] = []
    created_entry_phrases = []
    ai_mod = providers.ai()

    if not operations:
        say_text = replies.render("not_understood", language)
        return [{"type": "not_understood", "turn_id": turn_id, "say": say_text}]

    op_idx = 0
    while op_idx < len(operations):
        op = operations[op_idx]

        # Rule 1: Intent UNKNOWN, or confidence below 0.6 -> not_understood. Stop.
        if op.intent == "UNKNOWN" or op.confidence < validation.MIN_CONFIDENCE:
            say_text = replies.render("not_understood", language)
            return [{"type": "not_understood", "turn_id": turn_id, "say": say_text}]

        # Rule 7: CONFIRM or CHOOSE_CUSTOMER
        if op.intent in ("CONFIRM", "CHOOSE_CUSTOMER"):
            pending_q_data, remaining_ops_data = conversation.get_pending(session)
            if not pending_q_data:
                say_text = replies.render("not_understood", language)
                return [{"type": "not_understood", "turn_id": turn_id, "say": say_text}]

            if op.intent == "CHOOSE_CUSTOMER":
                # Spoken CHOOSE_CUSTOMER
                # match with options
                options = pending_q_data.get("options", [])
                opt_refs = [
                    CustomerRef(id=int(opt["id"]), name=opt["label"], area=None, phone=None)
                    for opt in options
                ]
                cands = ai_mod.match_customers(op.choice or "", opt_refs)
                if len(cands) == 1 and cands[0].score >= 90:
                    return await handle_choice(session.id, turn_id, {"customer_id": cands[0].customer_id}, now)
                else:
                    # Ask once more if not re-asked yet
                    reask_count = pending_q_data.get("reask_count", 0)
                    if reask_count == 0:
                        pending_q_data["reask_count"] = 1
                        conversation.set_pending(db, session, pending_q_data, remaining_ops_data)
                        return [{
                            "type": "question",
                            "turn_id": turn_id,
                            "kind": pending_q_data["kind"],
                            "say": pending_q_data["say"],
                            "options": pending_q_data["options"],
                        }]
                    else:
                        conversation.clear_pending(db, session)
                        say_text = replies.render("not_understood", language)
                        return [{"type": "not_understood", "turn_id": turn_id, "say": say_text}]

            elif op.intent == "CONFIRM":
                ch = op.choice or ""
                if pending_q_data["kind"] == "confirm_direction":
                    return await handle_choice(session.id, turn_id, {"answer": op.direction or ch}, now)
                else:
                    return await handle_choice(session.id, turn_id, {"answer": ch}, now)

        # Rule 2: CREATE_TRANSACTION
        if op.intent == "CREATE_TRANSACTION":
            # 2.a Direction missing
            if not op.direction:
                if strict:
                    return [{"type": "not_saved", "turn_id": turn_id, "text": transcript.text, "say": replies.render("not_saved", language)}]
                # Question confirm_direction
                say_text = replies.render("confirm_direction", language, name=op.customer_name or "", amount=op.amount_paise or 0)
                q_msg = {
                    "type": "question",
                    "turn_id": turn_id,
                    "kind": "confirm_direction",
                    "say": say_text,
                    "options": [
                        {"id": "credit", "label": "Udhaar"},
                        {"id": "payment", "label": "Jama"}
                    ],
                }
                rem_ops = [o.model_dump(mode="json") for o in operations[op_idx+1:]]
                conversation.set_pending(db, session, {"kind": "confirm_direction", "turn_id": turn_id, "options": q_msg["options"], "say": say_text, "about": {"operation": op.model_dump(mode="json")}}, rem_ops)
                return messages + [q_msg]

            # 2.b Amount missing or unparsed
            if op.amount_paise is None or op.amount_check == "unparsed":
                say_text = replies.render("not_understood", language)
                return [{"type": "not_understood", "turn_id": turn_id, "say": say_text}]

            # 2.c Amount mismatch, above MAX_AMOUNT_PAISE, or outlier
            bypass_amt = getattr(op, "bypass_amount_check", False)
            if not bypass_amt:
                is_outl = False
                if op.direction == "credit":
                    # If we know customer
                    temp_custs = ai_mod.match_customers(op.customer_name or "", ledger.customer_refs(db, shop.id, now))
                    if temp_custs:
                        cnt, med = ledger.credit_stats(db, temp_custs[0].customer_id)
                        is_outl = validation.is_outlier(cnt, med, op.amount_paise)

                if op.amount_check == "mismatch" or op.amount_paise > validation.MAX_AMOUNT_PAISE or is_outl:
                    if strict:
                        return [{"type": "not_saved", "turn_id": turn_id, "text": transcript.text, "say": replies.render("not_saved", language)}]
                    say_text = replies.render("confirm_amount", language, amount=op.amount_paise)
                    q_msg = {
                        "type": "question",
                        "turn_id": turn_id,
                        "kind": "confirm_amount",
                        "say": say_text,
                        "options": [
                            {"id": "yes", "label": "Haan"},
                            {"id": "no", "label": "Nahi"}
                        ],
                    }
                    rem_ops = [o.model_dump(mode="json") for o in operations[op_idx+1:]]
                    conversation.set_pending(db, session, {"kind": "confirm_amount", "turn_id": turn_id, "options": q_msg["options"], "say": say_text, "about": {"operation": op.model_dump(mode="json")}}, rem_ops)
                    return messages + [q_msg]

            # 2.d Customer matching
            cust_id = getattr(op, "customer_id", None)
            cust_name = getattr(op, "customer_name", None)
            is_new_customer = getattr(op, "new_customer", False)

            if not cust_id:
                c_refs = ledger.customer_refs(db, shop.id, now)
                candidates = ai_mod.match_customers(cust_name or "", c_refs)
                high_cands = [c for c in candidates if c.score >= 90]

                if len(high_cands) >= 2:
                    if strict:
                        return [{"type": "not_saved", "turn_id": turn_id, "text": transcript.text, "say": replies.render("not_saved", language)}]
                    # Duplicate names or same scores -> choose_customer
                    opts = []
                    names_seen = [c.name for c in high_cands]
                    has_identical_names = len(set(names_seen)) < len(names_seen)
                    for c in high_cands:
                        label = f"{c.name} ({c.area})" if (has_identical_names and c.area) else c.name
                        opts.append({"id": str(c.customer_id), "label": label})

                    say_text = replies.render("choose_customer", language, options=[o["label"] for o in opts])
                    q_msg = {
                        "type": "question",
                        "turn_id": turn_id,
                        "kind": "choose_customer",
                        "say": say_text,
                        "options": opts,
                    }
                    rem_ops = [o.model_dump(mode="json") for o in operations[op_idx+1:]]
                    conversation.set_pending(db, session, {"kind": "choose_customer", "turn_id": turn_id, "options": opts, "say": say_text, "about": {"operation": op.model_dump(mode="json")}}, rem_ops)
                    return messages + [q_msg]

                elif len(high_cands) == 1:
                    cust_id = high_cands[0].customer_id
                    cust_name = high_cands[0].name
                elif len(candidates) > 0 and 75 <= candidates[0].score <= 89:
                    if strict:
                        return [{"type": "not_saved", "turn_id": turn_id, "text": transcript.text, "say": replies.render("not_saved", language)}]
                    best = candidates[0]
                    say_text = replies.render("confirm_similar", language, name=best.name)
                    q_msg = {
                        "type": "question",
                        "turn_id": turn_id,
                        "kind": "confirm_similar",
                        "say": say_text,
                        "options": [
                            {"id": "yes", "label": f"Haan, {best.name}"},
                            {"id": "no", "label": "Naya grahak"}
                        ],
                    }
                    rem_ops = [o.model_dump(mode="json") for o in operations[op_idx+1:]]
                    conversation.set_pending(db, session, {"kind": "confirm_similar", "turn_id": turn_id, "options": q_msg["options"], "say": say_text, "about": {"operation": op.model_dump(mode="json"), "candidate_id": best.customer_id}}, rem_ops)
                    return messages + [q_msg]
                else:
                    # No candidate: create new customer
                    new_c = ledger.create_customer(db, shop.id, cust_name or "Grahak", None, None, source="voice")
                    cust_id = new_c.id
                    cust_name = new_c.name
                    is_new_customer = True

            # 2.e Duplicate detection
            bypass_dup = getattr(op, "bypass_duplicate", False)
            idem_key = f"{turn_id}:{op_idx}"
            if not bypass_dup:
                dup = ledger.find_recent_duplicate(db, cust_id, op.amount_paise, op.direction, now, validation.DUPLICATE_WINDOW_SECONDS)
                if dup and dup.idempotency_key != idem_key:
                    if strict:
                        return [{"type": "not_saved", "turn_id": turn_id, "text": transcript.text, "say": replies.render("not_saved", language)}]
                    say_text = replies.render("confirm_duplicate", language, name=cust_name, amount=op.amount_paise)
                    q_msg = {
                        "type": "question",
                        "turn_id": turn_id,
                        "kind": "confirm_duplicate",
                        "say": say_text,
                        "options": [
                            {"id": "yes", "label": "Haan"},
                            {"id": "no", "label": "Nahi"}
                        ],
                    }
                    rem_ops = [o.model_dump(mode="json") for o in operations[op_idx+1:]]
                    conversation.set_pending(db, session, {"kind": "confirm_duplicate", "turn_id": turn_id, "options": q_msg["options"], "say": say_text, "about": {"operation": op.model_dump(mode="json")}}, rem_ops)
                    return messages + [q_msg]

            # 2.f Save transaction
            b_date = op.business_date or ai_mod.business_date(now, _get_shop_info(shop))
            txn, created = ledger.create_entry(
                db=db,
                shop_id=shop.id,
                customer_id=cust_id,
                amount_paise=op.amount_paise,
                direction=op.direction,
                business_date=b_date,
                recorded_at=now,
                status="active",
                source=source,
                language=language,
                raw_transcript=transcript.text,
                session_id=session.id,
                idempotency_key=idem_key,
            )
            conversation.set_last_entry(db, session, txn.id, now)

            bal = ledger.customer_balance(db, cust_id)
            kolkata_str = now.astimezone(timezone(timedelta(hours=5, minutes=30))).isoformat()

            entry_payload = {
                "id": txn.id,
                "customer_id": cust_id,
                "customer_name": cust_name,
                "amount_paise": txn.amount_paise,
                "direction": txn.direction,
                "business_date": txn.business_date.isoformat(),
                "recorded_at": kolkata_str,
                "status": "new",
                "old_amount_paise": None,
                "language": language,
            }
            messages.append({
                "type": "entry",
                "turn_id": turn_id,
                "entry": entry_payload,
                "balance_paise": bal,
                "new_customer": is_new_customer,
            })

            # Prepare spoken confirmation phrase for this entry
            phrase_key = "entry_credit" if op.direction == "credit" else "entry_payment"
            phrase = replies.render(phrase_key, language, name=cust_name, amount=op.amount_paise, balance=bal)
            if is_new_customer:
                prefix = replies.render("new_customer_prefix", language, name=cust_name)
                phrase = prefix + phrase
            created_entry_phrases.append(phrase)

        # Rule 3: CORRECTION
        elif op.intent == "CORRECTION":
            if not session.last_txn_id:
                say_text = replies.render("not_understood", language)
                return [{"type": "not_understood", "turn_id": turn_id, "say": say_text}]

            txn = db.query(Transaction).filter(Transaction.id == session.last_txn_id).first()
            if not txn or txn.status != "active":
                say_text = replies.render("not_understood", language)
                return [{"type": "not_understood", "turn_id": turn_id, "say": say_text}]

            if op.amount_paise is None or op.amount_check == "unparsed":
                say_text = replies.render("not_understood", language)
                return [{"type": "not_understood", "turn_id": turn_id, "say": say_text}]

            cust = db.query(Customer).filter(Customer.id == txn.customer_id).first()
            cust_name = cust.name if cust else ""

            bypass_window = getattr(op, "bypass_window_check", False)
            if not bypass_window and not validation.is_within_amend_window(session.last_txn_at, now):
                if strict:
                    return [{"type": "not_saved", "turn_id": turn_id, "text": transcript.text, "say": replies.render("not_saved", language)}]
                say_text = replies.render("confirm_amend", language, name=cust_name, amount=op.amount_paise)
                q_msg = {
                    "type": "question",
                    "turn_id": turn_id,
                    "kind": "confirm_amend",
                    "say": say_text,
                    "options": [
                        {"id": "yes", "label": "Haan"},
                        {"id": "no", "label": "Nahi"}
                    ],
                }
                rem_ops = [o.model_dump(mode="json") for o in operations[op_idx+1:]]
                conversation.set_pending(db, session, {"kind": "confirm_amend", "turn_id": turn_id, "options": q_msg["options"], "say": say_text, "about": {"operation": op.model_dump(mode="json")}}, rem_ops)
                return messages + [q_msg]

            # Amend entry
            old_amt = txn.amount_paise
            txn, hist = ledger.amend_entry(db, txn.id, op.amount_paise, session.id, now)
            bal = ledger.customer_balance(db, txn.customer_id)
            kolkata_str = now.astimezone(timezone(timedelta(hours=5, minutes=30))).isoformat()

            entry_payload = {
                "id": txn.id,
                "customer_id": txn.customer_id,
                "customer_name": cust_name,
                "amount_paise": txn.amount_paise,
                "direction": txn.direction,
                "business_date": txn.business_date.isoformat(),
                "recorded_at": kolkata_str,
                "status": "amended",
                "old_amount_paise": old_amt,
                "language": language,
            }
            messages.append({
                "type": "entry",
                "turn_id": turn_id,
                "entry": entry_payload,
                "balance_paise": bal,
                "new_customer": False,
            })
            phrase = replies.render("entry_amended", language, name=cust_name, amount=op.amount_paise, balance=bal)
            created_entry_phrases.append(phrase)

        # Rule 4: UNDO_LAST
        elif op.intent == "UNDO_LAST":
            if not session.last_txn_id:
                say_text = replies.render("nothing_to_undo", language)
                return [{"type": "answer", "turn_id": turn_id, "kind": "info", "say": say_text, "data": {}}]

            txn = db.query(Transaction).filter(Transaction.id == session.last_txn_id).first()
            if not txn or txn.status != "active":
                say_text = replies.render("nothing_to_undo", language)
                return [{"type": "answer", "turn_id": turn_id, "kind": "info", "say": say_text, "data": {}}]

            cust = db.query(Customer).filter(Customer.id == txn.customer_id).first()
            cust_name = cust.name if cust else ""

            bypass_window = getattr(op, "bypass_window_check", False)
            if not bypass_window and not validation.is_within_amend_window(session.last_txn_at, now):
                if strict:
                    return [{"type": "not_saved", "turn_id": turn_id, "text": transcript.text, "say": replies.render("not_saved", language)}]
                say_text = replies.render("confirm_undo", language, name=cust_name, amount=txn.amount_paise)
                q_msg = {
                    "type": "question",
                    "turn_id": turn_id,
                    "kind": "confirm_undo",
                    "say": say_text,
                    "options": [
                        {"id": "yes", "label": "Haan"},
                        {"id": "no", "label": "Nahi"}
                    ],
                }
                rem_ops = [o.model_dump(mode="json") for o in operations[op_idx+1:]]
                conversation.set_pending(db, session, {"kind": "confirm_undo", "turn_id": turn_id, "options": q_msg["options"], "say": say_text, "about": {"operation": op.model_dump(mode="json")}}, rem_ops)
                return messages + [q_msg]

            # Perform undo
            old_amt = txn.amount_paise
            txn, hist = ledger.undo_entry(db, txn.id, session.id, now)
            bal = ledger.customer_balance(db, txn.customer_id)
            kolkata_str = now.astimezone(timezone(timedelta(hours=5, minutes=30))).isoformat()

            entry_payload = {
                "id": txn.id,
                "customer_id": txn.customer_id,
                "customer_name": cust_name,
                "amount_paise": old_amt,
                "direction": txn.direction,
                "business_date": txn.business_date.isoformat(),
                "recorded_at": kolkata_str,
                "status": "undone",
                "old_amount_paise": None,
                "language": language,
            }
            messages.append({
                "type": "entry",
                "turn_id": turn_id,
                "entry": entry_payload,
                "balance_paise": bal,
                "new_customer": False,
            })
            phrase = replies.render("entry_undone", language, name=cust_name, amount=old_amt, balance=bal)
            created_entry_phrases.append(phrase)

        # Rule 5: QUERY_BALANCE
        elif op.intent == "QUERY_BALANCE":
            c_refs = ledger.customer_refs(db, shop.id, now)
            candidates = ai_mod.match_customers(op.customer_name or "", c_refs)
            if not candidates:
                say_text = replies.render("customer_not_found", language, name=op.customer_name or "")
                ans_msg = {"type": "answer", "turn_id": turn_id, "kind": "info", "say": say_text, "data": {}}
                return _append_disclosure_if_needed(db, session, language, messages + [ans_msg])

            high_cands = [c for c in candidates if c.score >= 90]
            if len(high_cands) >= 2:
                opts = []
                for c in high_cands:
                    opts.append({"id": str(c.customer_id), "label": c.name})
                say_text = replies.render("choose_customer", language, options=[o["label"] for o in opts])
                q_msg = {
                    "type": "question",
                    "turn_id": turn_id,
                    "kind": "choose_customer",
                    "say": say_text,
                    "options": opts,
                }
                conversation.set_pending(db, session, {"kind": "choose_customer", "turn_id": turn_id, "options": opts, "say": say_text, "about": {"operation": op.model_dump(mode="json")}}, [])
                return messages + [q_msg]

            target_cust = db.query(Customer).filter(Customer.id == candidates[0].customer_id).first()
            bal = ledger.customer_balance(db, target_cust.id)
            key = "balance_zero" if bal == 0 else ("balance_advance" if bal < 0 else "balance")
            say_text = replies.render(key, language, name=target_cust.name, balance=bal)
            ans_data = {
                "customer_id": target_cust.id,
                "customer_name": target_cust.name,
                "balance_paise": bal,
            }
            ans_msg = {"type": "answer", "turn_id": turn_id, "kind": "balance", "say": say_text, "data": ans_data}
            return _append_disclosure_if_needed(db, session, language, messages + [ans_msg])

        # Rule 6: QUERY_DAILY_TOTAL and QUERY_DAY_SUMMARY
        elif op.intent == "QUERY_DAILY_TOTAL":
            b_date = ai_mod.business_date(now, _get_shop_info(shop))
            tot_credit = ledger.daily_credit_total(db, shop.id, b_date)
            say_text = replies.render("daily_total", language, amount=tot_credit)
            ans_data = {
                "business_date": b_date.isoformat(),
                "credit_paise": tot_credit,
            }
            ans_msg = {"type": "answer", "turn_id": turn_id, "kind": "daily_total", "say": say_text, "data": ans_data}
            return _append_disclosure_if_needed(db, session, language, messages + [ans_msg])

        elif op.intent == "QUERY_DAY_SUMMARY":
            b_date = ai_mod.business_date(now, _get_shop_info(shop))
            summary_data = ledger.day_summary(db, shop.id, b_date)
            say_text = replies.render(
                "day_summary",
                language,
                credit=summary_data["credit_paise"],
                payment=summary_data["payment_paise"],
                top=summary_data["top"],
            )
            ans_msg = {"type": "answer", "turn_id": turn_id, "kind": "day_summary", "say": say_text, "data": summary_data}
            return _append_disclosure_if_needed(db, session, language, messages + [ans_msg])

        op_idx += 1

    # Rule 10: Final message for entries only
    if created_entry_phrases:
        if len(created_entry_phrases) >= 3:
            combined_say = replies.render("entries_many", language, count=len(created_entry_phrases))
        else:
            combined_say = " ".join(created_entry_phrases)

        ans_msg = {
            "type": "answer",
            "turn_id": turn_id,
            "kind": "entry_saved",
            "say": combined_say,
            "data": {"count": len(created_entry_phrases)},
        }
        return _append_disclosure_if_needed(db, session, language, messages + [ans_msg])

    return messages


def _append_disclosure_if_needed(
    db: Session,
    session: ConversationSession,
    language: Lang,
    messages: list[dict],
) -> list[dict]:
    if not messages:
        return messages

    final_msg = messages[-1]
    if "say" in final_msg and not session.disclosed:
        disc = replies.render("disclosure", language)
        final_msg["say"] = f"{disc} {final_msg['say']}"
        conversation.mark_disclosed(db, session)

    session.last_language = language
    db.commit()
    return messages
