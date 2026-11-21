from __future__ import annotations
import json
from typing import Literal
from pydantic import BaseModel, Field
from app.schemas.contracts import Context, Transcript, Intent, Lang

SYSTEM_PROMPT = """You turn what a kirana shopkeeper said into ledger operations. You only propose; software checks and saves. Speech may be Hindi, Kannada, English or a mix, in Latin, Devanagari or Kannada script. Return JSON matching the schema, one operation per action, in spoken order.
Intents:
- CREATE_TRANSACTION: a new credit (customer took goods on udhaar, baaki, likh do, saala) or a payment (customer paid: diya, diye, jama, de gaya, chukaya, kottaru, paid).
- CORRECTION: the shopkeeper corrects the last entry's amount ("nahi, 430", "galat, 430 tha").
- UNDO_LAST: remove the last entry ("pichla hatao", "last wala cancel").
- QUERY_BALANCE: one customer's balance ("Ramesh ka total?").
- QUERY_DAILY_TOTAL: today's total credit ("aaj kitna udhaar gaya?").
- QUERY_DAY_SUMMARY: today's full account ("aaj ka hisaab").
- CONFIRM: a reply to the pending question; choice is "yes" or "no", or "credit" or "payment" when the question asks which.
- CHOOSE_CUSTOMER: says which customer the pending question meant; choice is the identifying words.
- UNKNOWN: anything else.
Rules:
1. customer_name: when the speech names a listed customer, copy the listed spelling, but only the words actually spoken. If only "Ramesh" was said, return "Ramesh" even if two Rameshes exist. Never add a surname or area that was not spoken. A new customer's name is written in Latin letters.
2. amount_spoken: the exact words or digits for the amount as heard. amount_digits: the same amount as plain rupee digits ("340"). Do no other arithmetic.
3. direction: "credit" when the customer owes more, "payment" when the customer paid; null if unclear.
4. date_expression: the date words spoken ("kal", "parso", "ninne", "yesterday", "3 din pehle"), else null. Never compute dates.
5. confidence: 0 to 1 for the whole operation; below 0.6 if the speech is unclear or unrelated.
6. Never give advice; never mention lending, interest or reminders; never invent customers or amounts.
7. language: the main language of the speech, "hi", "kn" or "en"."""

FEW_SHOT = [
    {
        "input": "Suresh ka 200 udhaar, kal 100 diya tha",
        "output": {
            "operations": [
                {"intent": "CREATE_TRANSACTION", "customer_name": "Suresh", "amount_spoken": "200", "amount_digits": "200", "direction": "credit", "date_expression": None, "choice": None, "confidence": 1.0},
                {"intent": "CREATE_TRANSACTION", "customer_name": "Suresh", "amount_spoken": "100", "amount_digits": "100", "direction": "payment", "date_expression": "kal", "choice": None, "confidence": 1.0}
            ],
            "language": "hi"
        }
    },
    {
        "input": "Ramesh sharma ka teen sau chaalis likh do",
        "output": {
            "operations": [
                {"intent": "CREATE_TRANSACTION", "customer_name": "Ramesh Sharma", "amount_spoken": "teen sau chaalis", "amount_digits": "340", "direction": "credit", "date_expression": None, "choice": None, "confidence": 1.0}
            ],
            "language": "hi"
        }
    },
    {
        "input": "Ramesh ka total?",
        "output": {
            "operations": [
                {"intent": "QUERY_BALANCE", "customer_name": "Ramesh", "amount_spoken": None, "amount_digits": None, "direction": None, "date_expression": None, "choice": None, "confidence": 1.0}
            ],
            "language": "hi"
        }
    },
    {
        "input": "Gupta wale (context: pending choose_customer Ramesh Sharma, Ramesh Gupta)",
        "output": {
            "operations": [
                {"intent": "CHOOSE_CUSTOMER", "customer_name": None, "amount_spoken": None, "amount_digits": None, "direction": None, "date_expression": None, "choice": "Gupta", "confidence": 1.0}
            ],
            "language": "hi"
        }
    },
    {
        "input": "Kal mausam achha tha",
        "output": {
            "operations": [
                {"intent": "UNKNOWN", "customer_name": None, "amount_spoken": None, "amount_digits": None, "direction": None, "date_expression": None, "choice": None, "confidence": 0.1}
            ],
            "language": "hi"
        }
    },
    {
        "input": "Suresh ge nooru roopayi saala",
        "output": {
            "operations": [
                {"intent": "CREATE_TRANSACTION", "customer_name": "Suresh", "amount_spoken": "nooru", "amount_digits": "100", "direction": "credit", "date_expression": None, "choice": None, "confidence": 1.0}
            ],
            "language": "kn"
        }
    }
]


class LLMOperation(BaseModel):
    intent: Intent
    customer_name: str | None = None
    amount_spoken: str | None = None
    amount_digits: str | None = None
    direction: Literal["credit", "payment"] | None = None
    date_expression: str | None = None
    choice: str | None = None
    confidence: float = 1.0


class LLMOutput(BaseModel):
    operations: list[LLMOperation] = Field(default_factory=list)
    language: Lang = "hi"


def build_user_message(transcript: Transcript, context: Context) -> str:
    customers_summary = [{"name": c.name, "area": c.area} for c in context.customers]
    last_entry_summary = None
    if context.last_entry:
        last_entry_summary = {
            "customer": context.last_entry.customer_name,
            "amount_rupees": context.last_entry.amount_paise // 100,
            "direction": context.last_entry.direction,
        }

    pending_summary = None
    if context.pending_question:
        pending_summary = {
            "kind": context.pending_question.kind,
            "options": [opt.get("label") for opt in context.pending_question.options],
        }

    from app.ai.shop_clock import business_date
    today_bdate = business_date(context.now, context.shop).isoformat()

    data = {
        "text": transcript.text,
        "customers": customers_summary,
        "last_entry": last_entry_summary,
        "pending_question": pending_summary,
        "today_business_date": today_bdate,
    }
    return json.dumps(data, ensure_ascii=False)
