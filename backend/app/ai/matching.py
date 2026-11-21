from __future__ import annotations
import re
import unicodedata
from rapidfuzz import fuzz
from app.schemas.contracts import CustomerRef, Candidate

HONORIFICS = {
    "ji", "jee", "bhai", "bhaiya", "bhaiyya", "sahab", "saab", "sir", "madam",
    "didi", "aunty", "uncle", "anna", "akka", "avare", "wale", "wala", "waale", "wali",
    "जी", "भाई", "भैया", "साहब", "सर", "मैडम", "दीदी", "वाले", "वाला", "वाली"
}

DEV_TO_LATIN = {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
    'ं': 'n', '्': '', 'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
    'ಶ': 'sh', 'ರ': 'r', 'ಮ': 'm', 'ೇ': 'e', 'ಷ': 'sh', 'ಸ': 's', 'ು': 'u', 'ಅ': 'a', 'ಿ': 'i', 'ತ': 't'
}

COMMON_INDIC_NAMES = {
    "रमेश": "ramesh",
    "शर्मा": "sharma",
    "गुप्ता": "gupta",
    "सुरेश": "suresh",
    "अमित": "amit",
    "रಮೇಶ್": "ramesh",
    "ಸುರೇಶ್": "suresh",
}


def _indic_to_latin(text: str) -> str:
    words = text.split()
    converted_words = []
    for w in words:
        if w in COMMON_INDIC_NAMES:
            converted_words.append(COMMON_INDIC_NAMES[w])
        else:
            converted_words.append(''.join(DEV_TO_LATIN.get(c, c) for c in w))
    return ' '.join(converted_words)


def normalize_name(name: str) -> str:
    if not name:
        return ""
    # Unicode NFC
    s = unicodedata.normalize("NFC", name).lower()
    # Transliterate Indic scripts if present
    if any((0x0900 <= ord(c) <= 0x097F) or (0x0C80 <= ord(c) <= 0x0CFF) for c in s):
        s = _indic_to_latin(s)
    # Remove punctuation
    s = re.sub(r"[^\w\s]", " ", s)
    tokens = s.split()
    filtered = [t for t in tokens if t not in HONORIFICS]
    return " ".join(filtered).strip()


def match_customers(name: str, customers: list[CustomerRef]) -> list[Candidate]:
    norm_spoken = normalize_name(name)
    if not norm_spoken:
        return []

    spoken_words = norm_spoken.split()
    candidates: list[Candidate] = []

    for c in customers:
        norm_cust = normalize_name(c.name)
        norm_area = normalize_name(c.area) if c.area else ""

        score = 0.0
        # 1. Exact match
        if norm_spoken == norm_cust:
            score = 100.0
        else:
            # 2. Check if every word of spoken name matches some word of cust name or area
            cust_and_area_words = norm_cust.split() + norm_area.split()
            all_words_matched = True
            for sw in spoken_words:
                sw_matched = False
                for cw in cust_and_area_words:
                    if fuzz.ratio(sw, cw) >= 90:
                        sw_matched = True
                        break
                if not sw_matched:
                    all_words_matched = False
                    break

            if all_words_matched and len(spoken_words) > 0:
                score = 95.0
            else:
                score = float(fuzz.ratio(norm_spoken, norm_cust))

        if score >= 75.0:
            candidates.append(
                Candidate(
                    customer_id=c.id,
                    name=c.name,
                    area=c.area,
                    score=score,
                )
            )

    # Ties sort by recent_count (higher first), then last_activity_at (newer first)
    # CustomerRef lookup dictionary for sorting
    cust_map = {c.id: c for c in customers}

    def sort_key(cand: Candidate):
        c_ref = cust_map.get(cand.customer_id)
        r_count = c_ref.recent_count if c_ref else 0
        l_act = (c_ref.last_activity_at.timestamp() if (c_ref and c_ref.last_activity_at) else 0.0)
        return (-cand.score, -r_count, -l_act)

    candidates.sort(key=sort_key)
    return candidates
