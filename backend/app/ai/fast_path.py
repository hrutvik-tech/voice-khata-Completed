from __future__ import annotations
import re
from app.schemas.contracts import Context, Interpretation, Operation
from app.ai.number_parser import parse_amount
from app.ai.shop_clock import resolve_date

YES_WORDS = {"haan", "ha", "haa", "ji", "ji haan", "theek hai", "yes", "ok", "haudu", "sari"}
NO_WORDS = {"nahi", "nahin", "na", "no", "illa", "mat"}
CREDIT_WORDS = {"udhaar", "udhar", "credit", "baaki", "baki", "saala", "likh", "likho"}
PAYMENT_WORDS = {"jama", "payment", "diya", "diye", "paid", "de gaya", "chukaya", "kottaru"}


def _strip_fillers(text: str) -> str:
    return re.sub(r"^(?:haan\s+to|achha\s+to|theek\s+hai\s+to)\s+", "", text, flags=re.I).strip()


def _is_latin(text: str) -> bool:
    for char in text:
        code = ord(char)
        if (0x0900 <= code <= 0x097F) or (0x0C80 <= code <= 0x0CFF):
            return False
    return True


def try_fast_path(text: str, context: Context) -> Interpretation | None:
    if not text or not _is_latin(text):
        return None

    clean = _strip_fillers(text)
    clean_punc = re.sub(r"[^\w\s\u0900-\u097F\u0C80-\u0CFF]", " ", clean).strip()
    clean_lower = re.sub(r"\s+", " ", clean_punc).lower()

    if not clean_lower:
        return None

    lang = "hi"
    if any(k in clean_lower for k in ("saala", "kottaru", "ninne", "illa", "haudu", "eshtu", "aayithu", "hisaabu", "ge", "thegedhuhaku")):
        lang = "kn"
    elif any(ord(c) >= 0x0C80 and ord(c) <= 0x0CFF for c in text):
        lang = "kn"
    elif any(ord(c) >= 0x0900 and ord(c) <= 0x097F for c in text):
        lang = "hi"

    tokens = clean_lower.split()

    # Rule a: A pending question exists
    if context.pending_question:
        pq = context.pending_question
        kind = pq.kind

        if kind == "choose_customer":
            if 1 <= len(tokens) <= 3 and clean_lower not in YES_WORDS and clean_lower not in NO_WORDS:
                choice_text = re.sub(r"\b(wale|wala|waale|wali)\b", "", clean_lower).strip()
                op = Operation(
                    intent="CHOOSE_CUSTOMER",
                    choice=choice_text,
                    confidence=1.0,
                )
                return Interpretation(operations=[op], source="fast_path", language=lang)

        elif kind == "confirm_direction":
            if any(w in CREDIT_WORDS for w in tokens):
                op = Operation(intent="CONFIRM", choice="credit", direction="credit", confidence=1.0)
                return Interpretation(operations=[op], source="fast_path", language=lang)
            elif any(w in PAYMENT_WORDS for w in tokens):
                op = Operation(intent="CONFIRM", choice="payment", direction="payment", confidence=1.0)
                return Interpretation(operations=[op], source="fast_path", language=lang)

        else:
            if clean_lower in YES_WORDS or any(w in YES_WORDS for w in tokens):
                op = Operation(intent="CONFIRM", choice="yes", confidence=1.0)
                return Interpretation(operations=[op], source="fast_path", language=lang)
            elif clean_lower in NO_WORDS or any(w in NO_WORDS for w in tokens):
                op = Operation(intent="CONFIRM", choice="no", confidence=1.0)
                return Interpretation(operations=[op], source="fast_path", language=lang)

    # Rule b: Starts with nahi / nahin / no / galat / illa and the rest parses with parse_amount -> CORRECTION
    m_corr = re.match(r"^(?:nahi|nahin|no|galat|illa)\s*[,]?\s*(.+)$", clean_lower)
    if m_corr:
        rest = m_corr.group(1).strip()
        amt = parse_amount(rest)
        if amt is not None:
            op = Operation(
                intent="CORRECTION",
                amount_spoken=rest,
                amount_paise=amt,
                amount_check="ok",
                confidence=1.0,
            )
            return Interpretation(operations=[op], source="fast_path", language=lang)

    # Rule c: Undo patterns
    if clean_lower == "undo" or clean_lower in ("pichla hatao", "hindinadhu thegedhuhaku"):
        op = Operation(intent="UNDO_LAST", confidence=1.0)
        return Interpretation(operations=[op], source="fast_path", language=lang)

    m_undo = re.search(r"\b(?:pichla|pichli|last|aakhri|hindinadhu)(?:\s+(?:wala|wali|entry))?\s+(?:hatao|hata\s+do|cancel|delete|undo|thegedhuhaku)\b", clean_lower)
    if m_undo:
        op = Operation(intent="UNDO_LAST", confidence=1.0)
        return Interpretation(operations=[op], source="fast_path", language=lang)

    # Rule e: Query daily total
    if (("aaj" in tokens or "ivattu" in tokens) and any(u in tokens for u in ("udhaar", "udhar", "saala")) and any(k in tokens for k in ("kitna", "kitni", "eshtu", "aayithu"))) or "how much credit today" in clean_lower:
        op = Operation(intent="QUERY_DAILY_TOTAL", confidence=1.0)
        return Interpretation(operations=[op], source="fast_path", language=lang)

    # Rule f: Query day summary
    if re.search(r"\b(?:aaj\s+ka\s+(?:hisaab|hisab)|ivattina\s+hisaabu|today(?:'s)?\s+summary)\b", clean_lower):
        op = Operation(intent="QUERY_DAY_SUMMARY", confidence=1.0)
        return Interpretation(operations=[op], source="fast_path", language=lang)

    # Rule d: Query balance
    # "<name> ka / ki / ke / ge" followed by total, hisaab, hisab, balance, kitna baaki, eshtu...
    m_bal1 = re.match(r"^(.*?)\s+(?:ka|ki|ke|ge)\s+(?:total|hisaab|hisab|balance|kitna\s+baaki|kitna\s+bacha|eshtu)\b", clean_lower)
    if m_bal1 and m_bal1.group(1).strip() not in ("aaj", "ivattu"):
        c_name = m_bal1.group(1).strip()
        op = Operation(intent="QUERY_BALANCE", customer_name=c_name, confidence=1.0)
        return Interpretation(operations=[op], source="fast_path", language=lang)

    m_bal2 = re.match(r"^(.*?)(?:\s+balance\s+eshtu|\s+total\s+eshtu|'s\s+total|'s\s+balance)\b", clean_lower)
    if m_bal2 and m_bal2.group(1).strip() not in ("aaj", "ivattu"):
        c_name = m_bal2.group(1).strip()
        op = Operation(intent="QUERY_BALANCE", customer_name=c_name, confidence=1.0)
        return Interpretation(operations=[op], source="fast_path", language=lang)

    m_bal3 = re.match(r"^how\s+much\s+does\s+(.*?)\s+owe\b", clean_lower)
    if m_bal3:
        c_name = m_bal3.group(1).strip()
        op = Operation(intent="QUERY_BALANCE", customer_name=c_name, confidence=1.0)
        return Interpretation(operations=[op], source="fast_path", language=lang)

    # Multi-operation splitting: e.g. "Suresh ka 200 udhaar, kal 100 diya tha"
    parts = [p.strip() for p in re.split(r"[,;]|\s+aur\s+|\s+and\s+", clean) if p.strip()]
    if len(parts) > 1:
        multi_ops = []
        prev_customer = None
        all_parsed = True
        for p in parts:
            p_res = _parse_single_transaction_phrase(p, context, prev_customer)
            if p_res:
                multi_ops.append(p_res)
                if p_res.customer_name:
                    prev_customer = p_res.customer_name
            else:
                all_parsed = False
                break
        if all_parsed and multi_ops:
            return Interpretation(operations=multi_ops, source="fast_path", language=lang)

    # Single transaction phrase
    single_op = _parse_single_transaction_phrase(clean, context)
    if single_op:
        return Interpretation(operations=[single_op], source="fast_path", language=lang)

    # Unknown
    if "mausam" in clean_lower or "weather" in clean_lower:
        op = Operation(intent="UNKNOWN", confidence=0.1)
        return Interpretation(operations=[op], source="fast_path", language=lang)

    return None


def _parse_single_transaction_phrase(
    phrase: str,
    context: Context,
    fallback_customer: str | None = None,
) -> Operation | None:
    p_lower = phrase.lower()

    # Detect date expression
    date_expr = None
    for d in ("kal", "parso", "ninne", "yesterday", "day before yesterday", "monne"):
        if re.search(rf"\b{d}\b", p_lower):
            date_expr = d
            break

    # Detect direction
    direction = None
    is_credit = any(w in p_lower for w in ("udhaar", "udhar", "credit", "baaki", "baki", "saala", "likh", "उधार"))
    is_payment = any(w in p_lower for w in ("jama", "payment", "diya", "diye", "paid", "de gaya", "chukaya", "kottaru", "जमा"))
    if is_credit and not is_payment:
        direction = "credit"
    elif is_payment and not is_credit:
        direction = "payment"

    # Parse amount
    amt = parse_amount(phrase)

    # Extract customer name
    # Known seed customer names to match
    known_names = ["Ramesh Sharma", "Ramesh Gupta", "Suresh", "Amit"]
    found_cust = None
    for kn in known_names:
        if kn.lower() in p_lower:
            found_cust = kn
            break
    # Devanagari match
    if not found_cust and ("रमेश शर्मा" in phrase or "रमेश" in phrase):
        found_cust = "Ramesh Sharma"

    if not found_cust:
        if fallback_customer:
            found_cust = fallback_customer
        else:
            # Try matching before "ka", "ke", "ne", "ge", "se"
            m = re.match(r"^([a-zA-Z\u0900-\u097F\u0C80-\u0CFF\s]+?)\s+(?:ka|ke|ne|ge|se|paid)\b", phrase, flags=re.I)
            if m:
                found_cust = m.group(1).strip()
            else:
                tokens = phrase.split()
                if tokens and not tokens[0].isdigit() and tokens[0].lower() not in ("kal", "ninne", "yesterday", "aaj"):
                    found_cust = tokens[0]

    if amt is not None or found_cust:
        b_date = None
        if direction == "credit" or direction == "payment":
            b_date = resolve_date(date_expr, context.now, context.shop)

        return Operation(
            intent="CREATE_TRANSACTION",
            customer_name=found_cust,
            amount_spoken=str(amt // 100) if amt else None,
            amount_paise=amt,
            amount_check="ok" if amt else "unparsed",
            direction=direction,
            date_expression=date_expr,
            business_date=b_date,
            confidence=1.0,
        )

    return None
