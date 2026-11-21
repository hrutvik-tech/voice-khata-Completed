from __future__ import annotations
import re

DEV_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
KAN_DIGITS = str.maketrans("೦೧೨೩೪೫೬೭೮೯", "0123456789")

HINDI_WORDS = {
    # 1-99 Devanagari & Latin
    "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "पाँच": 5, "छह": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10,
    "ग्यारह": 11, "बारह": 12, "तेरह": 13, "चौदह": 14, "पंद्रह": 15, "सोलह": 16, "सत्रह": 17, "अट्ठारह": 18, "उन्नीस": 19, "बीस": 20,
    "इक्कीस": 21, "बाईस": 22, "तेईस": 23, "चौबीस": 24, "पच्चीस": 25, "छब्बीस": 26, "सत्ताईस": 27, "अट्ठाईस": 28, "उनतीस": 29, "तीस": 30,
    "इकत्तीस": 31, "बत्तीस": 32, "तैंतीस": 33, "चौंतीस": 34, "पैंतीस": 35, "छत्तीस": 36, "सैंतीस": 37, "अड़तीस": 38, "उनतालीस": 39, "चालीस": 40,
    "इकतालीस": 41, "बयालीस": 42, "तैंतालीस": 43, "चवालीस": 44, "पैंतालीस": 45, "छियालीस": 46, "सैंतालीस": 47, "अड़तालीस": 48, "उनचास": 49, "पचास": 50,
    "इक्यावन": 51, "बावन": 52, "तिरेपन": 53, "चौवन": 54, "पचपन": 55, "छप्पन": 56, "सत्तावन": 57, "अट्ठावन": 58, "उनसठ": 59, "साठ": 60,
    "इकसठ": 61, "बासठ": 62, "तिरसठ": 63, "चौंसठ": 64, "पैंसठ": 65, "छियासठ": 66, "सरसठ": 67, "अड़सठ": 68, "उनहत्तर": 69, "सत्तर": 70,
    "इकहत्तर": 71, "बहत्तर": 72, "तिहत्तर": 73, "चौहत्तर": 74, "पचहत्तर": 75, "छिहत्तर": 76, "सतहत्तर": 77, "अठहत्तर": 78, "उन्नासी": 79, "अस्सी": 80,
    "इक्यासी": 81, "बयासी": 82, "तिरासी": 83, "चौरासी": 84, "पचासी": 85, "छियासी": 86, "सत्तासी": 87, "अट्ठासी": 88, "नवासी": 89, "नब्बे": 90,
    "इक्यानवे": 91, "बानवे": 92, "तिरानवे": 93, "चौरानवे": 94, "पंचानवे": 95, "छियानवे": 96, "सत्तानवे": 97, "अट्ठानवे": 98, "निन्यानवे": 99,

    "ek": 1, "do": 2, "teen": 3, "char": 4, "chaar": 4, "panch": 5, "paanch": 5, "chhah": 6, "che": 6, "chhe": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10,
    "gyarah": 11, "barah": 12, "terah": 13, "chaudah": 14, "pandrah": 15, "solah": 16, "satrah": 17, "atharah": 18, "attharah": 18, "unnis": 19, "unnees": 19, "bees": 20,
    "ikkis": 21, "ikkees": 21, "baees": 22, "bais": 22, "teis": 23, "teees": 23, "chaubis": 24, "chaubees": 24, "pacchis": 25, "pacchees": 25, "pachhis": 25, "chabbis": 26, "chabbees": 26,
    "sattais": 27, "sattaees": 27, "atthais": 28, "atthaees": 28, "untis": 29, "untees": 29, "tees": 30,
    "ikattis": 31, "ikattees": 31, "battis": 32, "battees": 32, "taintis": 33, "taintees": 33, "chautis": 34, "chautees": 34, "paintis": 35, "paintees": 35, "chhattis": 36, "chhattees": 36,
    "saintis": 37, "saintees": 37, "adtis": 38, "adtees": 38, "untalis": 39, "untalees": 39, "chalis": 40, "chaalis": 40,
    "iktalis": 41, "iktalees": 41, "bayalis": 42, "bayalees": 42, "taintalis": 43, "taintalees": 43, "chawalis": 44, "chawalees": 44, "paintalis": 45, "paintalees": 45, "chhiyalis": 46, "chhiyalees": 46,
    "saintalis": 47, "saintalees": 47, "adtalis": 48, "adtalees": 48, "unchas": 49, "pachas": 50, "pachaas": 50,
    "ikyavan": 51, "baavan": 52, "bawan": 52, "tirepan": 53, "chauvan": 54, "pachpan": 55, "chhappan": 56, "sattavan": 57, "tathavan": 58, "atthavan": 58, "unsath": 59, "saath": 60,
    "iksath": 61, "baasath": 62, "tirasath": 63, "chaunsath": 64, "painsath": 65, "chhiyasath": 66, "sarsath": 67, "adsath": 68, "unhattar": 69, "sattar": 70,
    "ikhattar": 71, "bahattar": 72, "tihattar": 73, "chauhattar": 74, "pachhattar": 75, "chhihattar": 76, "satattar": 77, "athhattar": 78, "unnasi": 79, "unnaasi": 79, "assi": 80, "assee": 80,
    "ikyasi": 81, "ikyaasi": 81, "bayasi": 82, "bayaasi": 82, "tirasi": 83, "tiraasi": 83, "chaurasi": 84, "chauraasi": 84, "pachasi": 85, "pachaasi": 85, "chhiyasi": 86, "chhiyaasi": 86,
    "sattasi": 87, "sattaasi": 87, "atthasi": 88, "atthaasi": 88, "nawasi": 89, "nawaasi": 89, "nabbe": 90,
    "ikyanve": 91, "ikyaanve": 92, "baanve": 92, "tiranve": 93, "chauranve": 94, "panchanve": 95, "chhiyanve": 96, "sattanve": 97, "atthanve": 98, "ninyanve": 99,
}

KANNADA_WORDS = {
    "ಒಂದು": 1, "ಎರಡು": 2, "ಮೂರು": 3, "ನಾಲ್ಕು": 4, "ಐದು": 5, "ಆರು": 6, "ಏಳು": 7, "ಎಂಟು": 8, "ಒಂಬತ್ತು": 9, "ಹತ್ತು": 10,
    "ಹನ್ನೊಂದು": 11, "ಹನ್ನೆರಡು": 12, "ಹದಿಮೂರು": 13, "ಹದಿನಾಲ್ಕು": 14, "ಹದಿನೈದು": 15, "ಹದಿನಾರು": 16, "ಹದಿನೇಳು": 17, "ಹದಿನೆಂಟು": 18, "ಹತ್ತೊಂಬತ್ತು": 19, "ಇಪ್ಪತ್ತು": 20,
    "ಇಪ್ಪತ್ತೊಂದು": 21, "ಇಪ್ಪತ್ತೆರಡು": 22, "ಇಪ್ಪತ್ತಮೂರು": 23, "ಇಪ್ಪತ್ನಾಲ್ಕು": 24, "ಇಪ್ಪತ್ತೈದು": 25, "ಇಪ್ಪತ್ತಾರು": 26, "ಇಪ್ಪತ್ತೇಳು": 27, "ಇಪ್ಪತ್ತೆಂಟು": 28, "ಇಪ್ಪತ್ತೊಂಬತ್ತು": 29, "ಮೂವತ್ತು": 30,
    "ಮೂವತ್ತೊಂದು": 31, "ಮೂವತ್ತೆರಡು": 32, "ಮೂವತ್ತಮೂರು": 33, "ಮೂವತ್ನಾಲ್ಕು": 34, "ಮೂವತ್ತೈದು": 35, "ಮೂವತ್ತಾರು": 36, "ಮೂವತ್ತೇಳು": 37, "ಮೂವತ್ತೆಂಟು": 38, "ಮೂವತ್ತೊಂಬತ್ತು": 39, "ನಲವತ್ತು": 40,
    "ನಲವತ್ತೊಂದು": 41, "ನಲವತ್ತೆರಡು": 42, "ನಲವತ್ತಮೂರು": 43, "ನಲವತ್ನಾಲ್ಕು": 44, "ನಲವತ್ತೈದು": 45, "ನಲವತ್ತಾರು": 46, "ನಲವತ್ತೇಳು": 47, "ನಲವತ್ತೆಂಟು": 48, "ನಲವತ್ತೊಂಬತ್ತು": 49, "ಐವತ್ತು": 50,
    "ಐವತ್ತೊಂದು": 51, "ಐವತ್ತೆರಡು": 52, "ಐವತ್ತಮೂರು": 53, "ಐವತ್ನಾಲ್ಕು": 54, "ಐವತ್ತೈದು": 55, "ಐವತ್ತಾರು": 56, "ಐವತ್ತೇಳು": 57, "ಐವತ್ತೆಂಟು": 58, "ಐವತ್ತೊಂಬತ್ತು": 59, "ಅರವತ್ತು": 60,
    "ಅರವತ್ತೊಂದು": 61, "ಅರವತ್ತೆರಡು": 62, "ಅರವತ್ತಮೂರು": 63, "ಅರವತ್ನಾಲ್ಕು": 64, "ಅರವತ್ತೈದು": 65, "ಅರವತ್ತಾರು": 66, "ಅರವತ್ತೇಳು": 67, "ಅರವತ್ತೆಂಟು": 68, "ಅರವತ್ತೊಂಬತ್ತು": 69, "ಎಪ್ಪತ್ತು": 70,
    "ಎಪ್ಪತ್ತೊಂದು": 71, "ಎಪ್ಪತ್ತೆರಡು": 72, "ಎಪ್ಪತ್ತಮೂರು": 73, "ಎಪ್ಪತ್ನಾಲ್ಕು": 74, "ಎಪ್ಪತ್ತೈದು": 75, "ಎಪ್ಪತ್ತಾರು": 76, "ಎಪ್ಪತ್ತೇಳು": 77, "ಎಪ್ಪತ್ತೆಂಟು": 78, "ಎಪ್ಪತ್ತೊಂಬತ್ತು": 79, "ಎಂಬತ್ತು": 80,
    "ಎಂಬತ್ತೊಂದು": 81, "ಎಂಬತ್ತೆರಡು": 82, "ಎಂಬತ್ತಮೂರು": 83, "ಎಂಬತ್ನಾಲ್ಕು": 84, "ಎಂಬತ್ತೈದು": 85, "ಎಂಬತ್ತಾರು": 86, "ಎಂಬತ್ತೇಳು": 87, "ಎಂಬತ್ತೆಂಟು": 88, "ಎಂಬತ್ತೊಂಬತ್ತು": 89, "ತೊಂಬತ್ತು": 90,
    "ತೊಂಬತ್ತೊಂದು": 91, "ತೊಂಬತ್ತೆರಡು": 92, "ತೊಂಬತ್ತಮೂರು": 93, "ತೊಂಬತ್ನಾಲ್ಕು": 94, "ತೊಂಬತ್ತೈದು": 95, "ತೊಂಬತ್ತಾರು": 96, "ತೊಂಬತ್ತೇಳು": 97, "ತೊಂಬತ್ತೆಂಟು": 98, "ತೊಂಬತ್ತೊಂಬತ್ತು": 99,

    "ondu": 1, "eradu": 2, "mooru": 3, "muru": 3, "naalku": 4, "nalku": 4, "aidu": 5, "aaru": 6, "elu": 7, "yelu": 7, "entu": 8, "ombattu": 9, "hattu": 10,
    "hannondu": 11, "hanneradu": 12, "hadimooru": 13, "hadinalku": 14, "hadinaidu": 15, "hadinaaru": 16, "hadinelu": 17, "hadinentalu": 18, "hadinentu": 18, "hattambattu": 19, "ippattu": 20,
    "ippattondu": 21, "ippatteradu": 22, "ippattmooru": 23, "ippatnalaku": 24, "ippattaidu": 25, "moovattu": 30, "movattu": 30,
    "nalavattu": 40, "aivattu": 50, "aravattu": 60, "eppattu": 70, "embattu": 80, "tombattu": 90,
}

ENGLISH_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
    "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
}

MULTIPLIERS = {
    # 100
    "sau": 100, "सौ": 100, "hundred": 100, "nooru": 100, "ನೂರು": 100,
    # 1,000
    "hazaar": 1000, "hazar": 1000, "hajar": 1000, "हज़ार": 1000, "हजार": 1000,
    "thousand": 1000, "saavira": 1000, "savira": 1000, "ಸಾವಿರ": 1000,
    # 1,00,000
    "lakh": 100000, "laakh": 100000, "लाख": 100000, "laksha": 100000, "ಲಕ್ಷ": 100000,
    # 1,00,00,000
    "crore": 10000000, "karod": 10000000, "करोड़": 10000000, "koti": 10000000, "ಕೋಟಿ": 10000000,
}


def _clean_text(s: str) -> str:
    # translate devanagari and kannada digits to ascii
    s = s.translate(DEV_DIGITS).translate(KAN_DIGITS)
    return s.lower()


def parse_amount(text: str | None) -> int | None:
    if not text:
        return None

    # Check for negative value in string
    if re.search(r"-\s*\d+", text):
        raise ValueError("Negative amount not allowed")

    clean = _clean_text(text)

    # Explicit check for 0 / zero / shunya / shoonyam
    if re.search(r"\b(0|zero|shunya|shoonya|shoonyam|ಶೂನ್ಯ)\b", clean):
        return None

    # 1. Match numeric digits, e.g. "₹340", "1,20,000", "340.50", "340"
    # Look for patterns like (rs|rupaye|₹)? \s* (\d+(?:,\d+)*(?:\.\d{1,2})?)
    # or (\d+) followed by (rupaye|rs|...)
    digit_pattern = r"(?:(?:₹|rs\.?|rupees?|rupaye?|rupay)\s*)?(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)(?:\s*(?:₹|rs\.?|rupees?|rupaye?|rupay))?"
    for m in re.finditer(digit_pattern, clean):
        val_str = m.group(1)
        if val_str:
            clean_num = val_str.replace(",", "")
            try:
                num_float = float(clean_num)
                if num_float <= 0:
                    return None
                paise = int(round(num_float * 100))
                # Check if there is an explicit paise mention after it, e.g. "340 rupees 50 paise"
                after_match = clean[m.end():]
                paise_m = re.search(r"(?:and|\+)?\s*(\d{1,2})\s*paise", after_match)
                if paise_m and "." not in val_str:
                    paise += int(paise_m.group(1))
                return paise
            except ValueError:
                pass

    # 2. Check Hindi special fraction words:
    # "saade teen sau" -> 350
    # "dedh hazaar" -> 1500
    # "dhai sau" -> 250
    # "sawa sau" -> 125
    # "paune teen sau" -> 275
    # "dedh sau" -> 150
    # "dhai hazaar" -> 2500
    if "saade" in clean or "saadhe" in clean or "साढ़े" in clean or "साडे" in clean:
        m = re.search(r"(?:saade|saadhe|साढ़े|साडे)\s+([^\s]+)\s+([^\s]+)", clean)
        if m:
            num_w, mult_w = m.group(1), m.group(2)
            base_n = HINDI_WORDS.get(num_w) or KANNADA_WORDS.get(num_w) or ENGLISH_WORDS.get(num_w)
            mult = MULTIPLIERS.get(mult_w)
            if base_n and mult:
                return int((base_n + 0.5) * mult * 100)
    if "paune" in clean or "पौने" in clean:
        m = re.search(r"(?:paune|पौने)\s+([^\s]+)\s+([^\s]+)", clean)
        if m:
            num_w, mult_w = m.group(1), m.group(2)
            base_n = HINDI_WORDS.get(num_w) or KANNADA_WORDS.get(num_w) or ENGLISH_WORDS.get(num_w)
            mult = MULTIPLIERS.get(mult_w)
            if base_n and mult:
                return int((base_n - 0.25) * mult * 100)
    if "dedh" in clean or "डेढ़" in clean or "देढ" in clean:
        m = re.search(r"(?:dedh|डेढ़|देढ)\s+([^\s]+)", clean)
        if m:
            mult_w = m.group(1)
            mult = MULTIPLIERS.get(mult_w)
            if mult:
                return int(1.5 * mult * 100)
    if "dhai" in clean or "dhaai" in clean or "ढाई" in clean:
        m = re.search(r"(?:dhai|dhaai|ढाई)\s+([^\s]+)", clean)
        if m:
            mult_w = m.group(1)
            mult = MULTIPLIERS.get(mult_w)
            if mult:
                return int(2.5 * mult * 100)
    if "sawa" in clean or "सवा" in clean:
        m = re.search(r"(?:sawa|सवा)\s+([^\s]+)", clean)
        if m:
            mult_w = m.group(1)
            mult = MULTIPLIERS.get(mult_w)
            if mult:
                return int(1.25 * mult * 100)

    # 3. Spoken shorthand: two adjacent number words with no multiplier
    # e.g. "three forty" -> 340, "four thirty" -> 430, "teen chaalis" -> 340
    all_units = {}
    all_units.update(ENGLISH_WORDS)
    all_units.update(HINDI_WORDS)
    all_units.update(KANNADA_WORDS)

    tokens = re.findall(r"[\w\u0900-\u097F\u0C80-\u0CFF]+", clean)

    for i in range(len(tokens) - 1):
        w1, w2 = tokens[i], tokens[i+1]
        v1 = all_units.get(w1)
        v2 = all_units.get(w2)
        if v1 is not None and v2 is not None:
            if 1 <= v1 <= 99 and 10 <= v2 <= 99:
                # "three forty" -> 3 * 100 + 40 = 340
                rupees = v1 * 100 + v2
                return rupees * 100

    # 4. Standard verbal expression parsing (e.g. "chaar sau tees", "one lakh twenty thousand", "nooru roopayi")
    total_rupees = 0
    current_chunk = 0
    found_any = False
    paise_part = 0

    idx = 0
    while idx < len(tokens):
        token = tokens[idx]
        if token in ("paise", "पैसे", "ಪೈಸೆ"):
            # The previous number was paise
            # (handled if structured, or current_chunk is paise)
            idx += 1
            continue

        if token in MULTIPLIERS:
            mult = MULTIPLIERS[token]
            if current_chunk == 0:
                current_chunk = 1
            if mult >= 100000:
                total_rupees += current_chunk * mult
                current_chunk = 0
            elif mult >= 1000:
                total_rupees += current_chunk * mult
                current_chunk = 0
            elif mult == 100:
                current_chunk = current_chunk * 100
            found_any = True
        elif token in all_units:
            # Check if 'do' is used as an imperative verb (e.g. 'likh do', 'kar do', 'de do')
            if token == "do" and idx > 0 and tokens[idx-1] in ("likh", "kar", "de", "bata", "rakh", "hata", "jama", "chod"):
                idx += 1
                continue
            val = all_units[token]
            current_chunk += val
            found_any = True
        elif token in ("and", "aur", "mattu"):
            pass
        elif token in ("rupaye", "rupees", "rupay", "रुपये", "रुपया", "ರೂಪಾಯಿ", "roopayi"):
            found_any = True
        idx += 1

    total_rupees += current_chunk

    # Check for "pachas paise" / "fifty paise"
    paise_match = re.search(r"(\w+)\s+(?:paise|पैसे|ಪೈಸೆ)", clean)
    if paise_match:
        pw = paise_match.group(1)
        pval = all_units.get(pw) or (int(pw) if pw.isdigit() else None)
        if pval is not None and 0 < pval < 100:
            paise_part = pval

    if found_any and (total_rupees > 0 or paise_part > 0):
        return total_rupees * 100 + paise_part

    return None
