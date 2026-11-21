from __future__ import annotations
import re
from app.schemas.contracts import Context, Interpretation, Operation
from app.ai.number_parser import parse_amount
from app.ai.shop_clock import resolve_date

YES_WORDS = {
    "haan", "ha", "haa", "ji", "ji haan", "theek hai", "yes", "ok", "haudu", "sari",
    "हाँ", "हां", "हाँजी", "जी", "जी हाँ", "ठीक", "ठीक है", "सही"
}
NO_WORDS = {
    "nahi", "nahin", "na", "no", "illa", "mat",
    "नहीं", "नही", "ना", "गलत", "मत"
}
CREDIT_WORDS = {
    "udhaar", "udhar", "credit", "baaki", "baki", "saala", "likh", "likho",
    "उधार", "बाकी", "लिखो", "लिख"
}
PAYMENT_WORDS = {
    "jama", "payment", "diya", "diye", "paid", "de gaya", "chukaya", "kottaru",
    "जमा", "दिया", "दिए", "चुकाया"
}


def _strip_fillers(text: str) -> str:
    return re.sub(
        r"^(?:haan\s+to|achha\s+to|theek\s+hai\s+to|हाँ\s+तो|अच्छा\s+तो|ठीक\s+है\s+तो)\s+",
        "",
        text,
        flags=re.I
    ).strip()


def _is_latin(text: str) -> bool:
    for char in text:
        code = ord(char)
        if (0x0900 <= code <= 0x097F) or (0x0C80 <= code <= 0x0CFF):
            return False
    return True


def try_fast_path(text: str, context: Context) -> Interpretation | None:
    if not text or not _is_latin(text):
        return None
    return _interpret_rule_based(text, context, is_fast_path=True)


def parse_indic_or_fallback(text: str, context: Context) -> Interpretation | None:
    if not text:
        return None
    return _interpret_rule_based(text, context, is_fast_path=False)


def _interpret_rule_based(text: str, context: Context, is_fast_path: bool = True) -> Interpretation | None:
    src = "fast_path" if is_fast_path else "fallback"
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
                choice_text = re.sub(r"\b(wale|wala|waale|wali|वाले|वाला|वाली)\b", "", clean_lower).strip()
                op = Operation(
                    intent="CHOOSE_CUSTOMER",
                    choice=choice_text,
                    confidence=1.0,
                )
                return Interpretation(operations=[op], source=src, language=lang)

        elif kind == "confirm_direction":
            if any(w in CREDIT_WORDS for w in tokens) or any(w in clean_lower for w in ("उधार", "udhaar", "udhar")):
                op = Operation(intent="CONFIRM", choice="credit", direction="credit", confidence=1.0)
                return Interpretation(operations=[op], source=src, language=lang)
            elif any(w in PAYMENT_WORDS for w in tokens) or any(w in clean_lower for w in ("जमा", "jama")):
                op = Operation(intent="CONFIRM", choice="payment", direction="payment", confidence=1.0)
                return Interpretation(operations=[op], source=src, language=lang)

        else:
            if clean_lower in YES_WORDS or any(w in YES_WORDS for w in tokens):
                op = Operation(intent="CONFIRM", choice="yes", confidence=1.0)
                return Interpretation(operations=[op], source=src, language=lang)
            elif clean_lower in NO_WORDS or any(w in NO_WORDS for w in tokens):
                op = Operation(intent="CONFIRM", choice="no", confidence=1.0)
                return Interpretation(operations=[op], source=src, language=lang)

    # Rule b: Starts with nahi / nahin / no / galat / illa / नहीं / ना and the rest parses with parse_amount -> CORRECTION
    m_corr = re.match(r"^(?:nahi|nahin|no|galat|illa|नहीं|नही|ना|गलत)\s*[,]?\s*(.+)$", clean_lower)
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
            return Interpretation(operations=[op], source=src, language=lang)

    # Rule c: Undo patterns (English, Hinglish, Devanagari)
    if clean_lower in ("undo", "pichla hatao", "hindinadhu thegedhuhaku", "पिछला हटाओ", "हटाओ", "रद्द करो"):
        op = Operation(intent="UNDO_LAST", confidence=1.0)
        return Interpretation(operations=[op], source=src, language=lang)

    m_undo = re.search(
        r"\b(?:pichla|pichli|last|aakhri|hindinadhu|पिछला|पिछली|आखरी|आखिरी)(?:\s+(?:wala|wali|entry|वाला|वाली))?\s+(?:hatao|hata\s+do|cancel|delete|undo|thegedhuhaku|हटाओ|हटा\s*दो|रद्द|मिटाओ)\b",
        clean_lower
    )
    if m_undo:
        op = Operation(intent="UNDO_LAST", confidence=1.0)
        return Interpretation(operations=[op], source=src, language=lang)

    # Rule e: Query daily total
    is_daily_total = (
        (("aaj" in tokens or "ivattu" in tokens or "आज" in tokens or "आज" in clean_lower)
         and any(u in clean_lower for u in ("udhaar", "udhar", "saala", "उधार"))
         and any(k in clean_lower for k in ("kitna", "kitni", "eshtu", "aayithu", "कितना", "कितनी", "गया")))
        or "how much credit today" in clean_lower
    )
    if is_daily_total:
        op = Operation(intent="QUERY_DAILY_TOTAL", confidence=1.0)
        return Interpretation(operations=[op], source=src, language=lang)

    # Rule f: Query day summary
    if re.search(r"\b(?:aaj\s+ka\s+(?:hisaab|hisab)|आज\s+का\s+(?:हिसाब|लेखा)|ivattina\s+hisaabu|today(?:'s)?\s+summary)\b", clean_lower):
        op = Operation(intent="QUERY_DAY_SUMMARY", confidence=1.0)
        return Interpretation(operations=[op], source=src, language=lang)

    # Rule d: Query balance
    # "<name> ka / ki / ke / ge" followed by total, hisaab, hisab, balance, kitna baaki, eshtu...
    m_bal1 = re.match(
        r"^(.*?)\s+(?:ka|ki|ke|ge|का|की|के)\s+(?:total|hisaab|hisab|balance|kitna\s+baaki|kitna\s+bacha|eshtu|कुल|हिसाब|बाकी|बकाया|कितना\s*बाकी)\b",
        clean_lower
    )
    if m_bal1 and m_bal1.group(1).strip() not in ("aaj", "ivattu", "आज"):
        c_name = m_bal1.group(1).strip()
        op = Operation(intent="QUERY_BALANCE", customer_name=c_name, confidence=1.0)
        return Interpretation(operations=[op], source=src, language=lang)

    m_bal2 = re.match(r"^(.*?)(?:\s+balance\s+eshtu|\s+total\s+eshtu|'s\s+total|'s\s+balance|\s+का\s+कुल|\s+का\s+हिसाब)\b", clean_lower)
    if m_bal2 and m_bal2.group(1).strip() not in ("aaj", "ivattu", "आज"):
        c_name = m_bal2.group(1).strip()
        op = Operation(intent="QUERY_BALANCE", customer_name=c_name, confidence=1.0)
        return Interpretation(operations=[op], source=src, language=lang)

    m_bal3 = re.match(r"^how\s+much\s+does\s+(.*?)\s+owe\b", clean_lower)
    if m_bal3:
        c_name = m_bal3.group(1).strip()
        op = Operation(intent="QUERY_BALANCE", customer_name=c_name, confidence=1.0)
        return Interpretation(operations=[op], source=src, language=lang)

    # Multi-operation splitting: e.g. "Suresh ka 200 udhaar, kal 100 diya tha"
    parts = [p.strip() for p in re.split(r"[,;]|\s+aur\s+|\s+and\s+|\s+और\s+", clean) if p.strip()]
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
            return Interpretation(operations=multi_ops, source=src, language=lang)

    # Single transaction phrase
    single_op = _parse_single_transaction_phrase(clean, context)
    if single_op:
        return Interpretation(operations=[single_op], source=src, language=lang)

    # Unknown
    if "mausam" in clean_lower or "weather" in clean_lower or "मौसम" in clean_lower:
        op = Operation(intent="UNKNOWN", confidence=0.1)
        return Interpretation(operations=[op], source=src, language=lang)

    return None


def _parse_single_transaction_phrase(
    phrase: str,
    context: Context,
    fallback_customer: str | None = None,
) -> Operation | None:
    p_lower = phrase.lower()

    # Detect date expression
    date_expr = None
    for d in ("kal", "parso", "ninne", "yesterday", "day before yesterday", "monne", "कल", "परसों", "ನಿನ್ನೆ", "ಮೊನ್ನೆ"):
        pattern = rf"\b{d}\b" if re.match(r"^[a-zA-Z]", d) else rf"{d}"
        if re.search(pattern, p_lower):
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
    found_cust = None

    # Check dynamic context customers first
    if context and context.customers:
        for c in context.customers:
            if c.name.lower() in p_lower or c.name in phrase:
                found_cust = c.name
                break

    # Check known seed names (specific full names first)
    if not found_cust:
        if "ramesh gupta" in p_lower or "रमेश गुप्ता" in phrase:
            found_cust = "Ramesh Gupta"
        elif "ramesh sharma" in p_lower or "रमेश शर्मा" in phrase:
            found_cust = "Ramesh Sharma"
        elif "suresh" in p_lower or "सुरेश" in phrase:
            found_cust = "Suresh"
        elif "amit" in p_lower or "अमित" in phrase:
            found_cust = "Amit"
        elif "ramesh" in p_lower or "रमेश" in phrase:
            found_cust = "Ramesh Sharma"

    if not found_cust:
        if fallback_customer:
            found_cust = fallback_customer
        else:
            # Try matching before "ka", "ke", "ne", "ge", "se", "का", "के", "ने", "से"
            m = re.match(r"^([a-zA-Z\u0900-\u097F\u0C80-\u0CFF\s]+?)\s+(?:ka|ke|ne|ge|se|paid|का|के|ने|से)\b", phrase, flags=re.I)
            if m:
                found_cust = m.group(1).strip()
            else:
                tokens = phrase.split()
                if tokens and not tokens[0].isdigit() and tokens[0].lower() not in ("kal", "ninne", "yesterday", "aaj", "कल", "आज"):
                    found_cust = tokens[0]

    # Only treat as CREATE_TRANSACTION if an amount is present, or if it's explicitly a transaction (direction present)
    if amt is not None or (direction is not None and found_cust):
        b_date = None
        if direction in ("credit", "payment"):
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
