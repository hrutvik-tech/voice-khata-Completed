from __future__ import annotations
from typing import Any
from app.schemas.contracts import Lang
from app.speech.number_words import rupees_in_words

TEMPLATES: dict[str, dict[str, str]] = {
    "disclosure": {
        "hi": "नमस्ते, मैं मुंशी हूँ, एक AI सहायक।",
        "en": "Hello, I'm Munshi, an AI assistant.",
        "kn": "ನಮಸ್ಕಾರ, ನಾನು ಮುನ್ಷಿ, ಒಬ್ಬ AI ಸಹಾಯಕ.",
    },
    "entry_credit": {
        "hi": "{name} के खाते में {amount} उधार लिख दिया। कुल बाकी {balance}।",
        "en": "Added {amount} credit for {name}. Balance {balance}.",
        "kn": "{name} ಅವರ ಖಾತೆಗೆ {amount} ಸಾಲ ಬರೆಯಲಾಗಿದೆ. ಒಟ್ಟು ಬಾಕಿ {balance}.",
    },
    "entry_payment": {
        "hi": "{name} से {amount} जमा लिया। कुल बाकी {balance}।",
        "en": "Received {amount} from {name}. Balance {balance}.",
        "kn": "{name} ಅವರಿಂದ {amount} ಸ್ವೀಕರಿಸಲಾಗಿದೆ. ಒಟ್ಟು ಬಾಕಿ {balance}.",
    },
    "entry_amended": {
        "hi": "ठीक है, {name} की एंट्री बदलकर {amount} कर दी। कुल बाकी {balance}।",
        "en": "Changed {name}'s entry to {amount}. Balance {balance}.",
        "kn": "ಸರಿ, {name} ಅವರ ನಮೂದನ್ನು {amount} ಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ. ಒಟ್ಟು ಬಾಕಿ {balance}.",
    },
    "entry_undone": {
        "hi": "{name} की {amount} वाली एंट्री हटा दी। कुल बाकी {balance}।",
        "en": "Removed {name}'s {amount} entry. Balance {balance}.",
        "kn": "{name} ಅವರ {amount} ನಮೂದನ್ನು ತೆಗೆದುಹಾಕಲಾಗಿದೆ. ಒಟ್ಟು ಬಾಕಿ {balance}.",
    },
    "entries_many": {
        "hi": "{count} एंट्री लिख दीं।",
        "en": "Saved {count} entries.",
        "kn": "{count} ನಮೂದುಗಳನ್ನು ದಾಖಲಿಸಲಾಗಿದೆ.",
    },
    "new_customer_prefix": {
        "hi": "नया ग्राहक {name} जोड़ा। ",
        "en": "Added new customer {name}. ",
        "kn": "ಹೊಸ ಗ್ರಾಹಕ {name} ಸೇರಿಸಲಾಗಿದೆ. ",
    },
    "balance": {
        "hi": "{name} का कुल बाकी {balance} है।",
        "en": "{name} owes {balance}.",
        "kn": "{name} ಅವರ ಒಟ್ಟು ಬಾಕಿ {balance} ಆಗಿದೆ.",
    },
    "balance_zero": {
        "hi": "{name} का कोई बाकी नहीं है।",
        "en": "{name} owes nothing.",
        "kn": "{name} ಅವರ ಯಾವುದೇ ಬಾಕಿ ಇಲ್ಲ.",
    },
    "balance_advance": {
        "hi": "{name} का {balance} एडवांस जमा है।",
        "en": "{name} has {balance} paid in advance.",
        "kn": "{name} ಅವರ {balance} ಮುಂಗಡ ಹಣವಿದೆ.",
    },
    "daily_total": {
        "hi": "आज कुल {amount} उधार गया।",
        "en": "Total credit today is {amount}.",
        "kn": "ಇಂದು ಒಟ್ಟು {amount} ಸಾಲ ನೀಡಲಾಗಿದೆ.",
    },
    "day_summary": {
        "hi": "आज {credit} उधार गया और {payment} जमा आया। सबसे ज़्यादा बाकी: {top}।",
        "en": "Today {credit} went on credit and {payment} came in. Highest balances: {top}.",
        "kn": "ಇಂದು {credit} ಸಾಲ ನೀಡಲಾಗಿದೆ ಮತ್ತು {payment} ಜಮಾ ಆಗಿದೆ. ಹೆಚ್ಚು ಬಾಕಿ: {top}.",
    },
    "choose_customer": {
        "hi": "कौन से? {options}?",
        "en": "Which one: {options}?",
        "kn": "ಯಾವ ಗ್ರಾಹಕರು? {options}?",
    },
    "confirm_similar": {
        "hi": "क्या आपका मतलब {name} है?",
        "en": "Do you mean {name}?",
        "kn": "ನಿಮ್ಮ ಉದ್ದೇಶ {name} ಅವರೇ?",
    },
    "confirm_amount": {
        "hi": "{amount}, सही है? हाँ या ना बोलिए।",
        "en": "Is {amount} right? Say yes or no.",
        "kn": "{amount}, ಸರಿಯಾಗಿದೆಯೇ? ಹೌದು ಅಥವಾ ಇಲ್ಲ ಎಂದು ಹೇಳಿ.",
    },
    "confirm_direction": {
        "hi": "{name} का {amount} उधार है या जमा?",
        "en": "Is {name}'s {amount} credit or payment?",
        "kn": "{name} ಅವರ {amount} ಸಾಲವೇ ಅಥವಾ ಜಮಾವೇ?",
    },
    "confirm_duplicate": {
        "hi": "{name} का {amount} अभी लिखा था। दोबारा लिखूँ?",
        "en": "I just saved {amount} for {name}. Save it again?",
        "kn": "{name} ಅವರಿಗೆ {amount} ಈಗಷ್ಟೇ ಬರೆಯಲಾಗಿತ್ತು. ಮತ್ತೆ ಬರೆಯಲೇ?",
    },
    "confirm_amend": {
        "hi": "{name} की पिछली एंट्री बदलकर {amount} कर दूँ?",
        "en": "Change {name}'s last entry to {amount}?",
        "kn": "{name} ಅವರ ಹಿಂದಿನ ನಮೂದನ್ನು {amount} ಗೆ ಬದಲಾಯಿಸಬೇಕೆ?",
    },
    "confirm_undo": {
        "hi": "{name} की {amount} वाली एंट्री हटा दूँ?",
        "en": "Remove {name}'s {amount} entry?",
        "kn": "{name} ಅವರ {amount} ನಮೂದನ್ನು ತೆಗೆದುಹಾಕಬೇಕೆ?",
    },
    "cancelled": {
        "hi": "ठीक है, कुछ नहीं लिखा।",
        "en": "Okay, nothing saved.",
        "kn": "ಸರಿ, ಏನನ್ನೂ ಬರೆಯಲಾಗಿಲ್ಲ.",
    },
    "not_understood": {
        "hi": "समझ नहीं आया, दोबारा बोलिए।",
        "en": "I didn't catch that, please say it again.",
        "kn": "ಅರ್ಥವಾಗಲಿಲ್ಲ, ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳಿ.",
    },
    "nothing_to_undo": {
        "hi": "हटाने के लिए कोई एंट्री नहीं है।",
        "en": "There's no entry to remove.",
        "kn": "ತೆಗೆದುಹಾಕಲು ಯಾವುದೇ ನಮೂದು ಇಲ್ಲ.",
    },
    "customer_not_found": {
        "hi": "{name} नाम का कोई ग्राहक नहीं मिला।",
        "en": "No customer named {name}.",
        "kn": "{name} ಹೆಸರಿನ ಯಾವುದೇ ಗ್ರಾಹಕರು ಸಿಗಲಿಲ್ಲ.",
    },
    "not_saved": {
        "hi": "ऑफलाइन एंट्री सेव नहीं हुई, दोबारा बोलिए।",
        "en": "An offline entry wasn't saved. Please say it again.",
        "kn": "ಆಫ್‌ಲೈನ್ ನಮೂದು ಉಳಿಸಲಾಗಿಲ್ಲ, ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳಿ.",
    },
    "stt_failed": {
        "hi": "आवाज़ नहीं पहुँची, दोबारा बोलिए।",
        "en": "The voice didn't come through. Please say it again.",
        "kn": "ಧ್ವನಿ ತಲುಪಲಿಲ್ಲ, ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳಿ.",
    },
}


def render(key: str, language: Lang, **values: Any) -> str:
    lang_dict = TEMPLATES.get(key, {})
    template = lang_dict.get(language) or lang_dict.get("hi", "")

    # Convert paise amounts to words if they are ints
    formatted_values = {}
    for k, v in values.items():
        if k in ("amount", "balance", "credit", "payment") and isinstance(v, int):
            formatted_values[k] = rupees_in_words(abs(v), language)
        elif k == "top" and isinstance(v, list):
            # [{ "customer_name": .., "balance_paise": .. }]
            formatted_pairs = []
            for item in v:
                c_name = item.get("customer_name") or item.get("name")
                c_bal = item.get("balance_paise", 0)
                formatted_pairs.append(f"{c_name} {rupees_in_words(c_bal, language)}")
            formatted_values["top"] = ", ".join(formatted_pairs)
        elif k == "options" and isinstance(v, list):
            joiner = " या " if language == "hi" else (" ಅಥವಾ " if language == "kn" else " or ")
            formatted_values["options"] = joiner.join(str(opt) for opt in v)
        else:
            formatted_values[k] = v

    try:
        return template.format(**formatted_values)
    except Exception:
        return template
