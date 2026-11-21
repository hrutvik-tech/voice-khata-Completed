from __future__ import annotations
import re
import unicodedata
from rapidfuzz import fuzz
from app.schemas.contracts import CustomerRef, Candidate

HONORIFICS = {
    "ji", "jee", "bhai", "bhaiya", "bhaiyya", "sahab", "saab", "sir", "madam",
    "didi", "aunty", "uncle", "anna", "akka", "avare", "wale", "wala", "waale", "wali"
}


def normalize_name(name: str) -> str:
    if not name:
        return ""
    # Unicode NFC
    s = unicodedata.normalize("NFC", name).lower()
    # Remove punctuation
    s = re.sub(r"[^\w\s\u0900-\u097F\u0C80-\u0CFF]", " ", s)
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
