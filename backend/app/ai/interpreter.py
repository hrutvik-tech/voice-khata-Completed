from __future__ import annotations
import asyncio
import logging
import time
from app.core.config import get_settings
from app.schemas.contracts import Context, Transcript, Interpretation, Operation
from app.ai.fast_path import try_fast_path
from app.ai.number_parser import parse_amount
from app.ai.shop_clock import resolve_date
from app.ai.prompts import SYSTEM_PROMPT, LLMOutput, build_user_message

logger = logging.getLogger("interpreter")


async def interpret(transcript: Transcript, context: Context) -> Interpretation:
    start_t = time.perf_counter()

    # a. Try fast-path first
    fp_res = try_fast_path(transcript.text, context)
    if fp_res is not None:
        duration_ms = int((time.perf_counter() - start_t) * 1000)
        logger.info(f"interpret source=fast_path model=none latency_ms={duration_ms}")
        return fp_res

    settings = get_settings()
    shop_fallback_lang = "hi" if context.shop.language_mode == "mix" else context.shop.language_mode

    # b. Call LLM
    llm_output: LLMOutput | None = None
    model_name = settings.GEMINI_MODEL or "gemini-2.5-flash"

    if settings.LLM_PROVIDER == "gemini" and settings.GEMINI_API_KEY:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        user_msg = build_user_message(transcript, context)

        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.0,
            response_mime_type="application/json",
            response_schema=LLMOutput,
            thinking_config=types.ThinkingConfig(thinking_budget=0)
        )

        for attempt in range(2):
            try:
                # 4 second timeout
                res = await asyncio.wait_for(
                    client.aio.models.generate_content(
                        model=model_name,
                        contents=user_msg,
                        config=config,
                    ),
                    timeout=4.0
                )
                if res.parsed:
                    llm_output = res.parsed
                    break
                elif res.text:
                    import json
                    data = json.loads(res.text)
                    llm_output = LLMOutput.model_validate(data)
                    break
            except Exception as e:
                logger.warning(f"Gemini call attempt {attempt+1} failed: {e}")
                if attempt == 0:
                    await asyncio.sleep(0.3)

    elif settings.LLM_PROVIDER == "evon" and settings.EVON_API_KEY:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.EVON_API_KEY, base_url="https://api.gnani.ai/v1")
        user_msg = build_user_message(transcript, context)
        for attempt in range(2):
            try:
                res = await asyncio.wait_for(
                    client.chat.completions.create(
                        model=settings.GEMINI_MODEL or "evon",
                        messages=[
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": user_msg}
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.0
                    ),
                    timeout=4.0
                )
                import json
                content = res.choices[0].message.content
                data = json.loads(content)
                llm_output = LLMOutput.model_validate(data)
                break
            except Exception as e:
                logger.warning(f"Evon call attempt {attempt+1} failed: {e}")
                if attempt == 0:
                    await asyncio.sleep(0.3)

    duration_ms = int((time.perf_counter() - start_t) * 1000)

    # e. If LLM failed or not available
    if llm_output is None or not llm_output.operations:
        from app.ai.fast_path import _parse_single_transaction_phrase
        parsed_fallback = _parse_single_transaction_phrase(transcript.text, context)
        if parsed_fallback:
            return Interpretation(
                operations=[parsed_fallback],
                source="fallback",
                language=transcript.language or shop_fallback_lang,
            )

        logger.info(f"interpret source=fallback model={model_name} latency_ms={duration_ms}")
        op = Operation(intent="UNKNOWN", confidence=0.0)
        return Interpretation(
            operations=[op],
            source="fallback",
            language=transcript.language or shop_fallback_lang,
        )

    # c. Post-process every LLM operation into an Operation
    ops: list[Operation] = []
    for raw_op in llm_output.operations:
        s = parse_amount(raw_op.amount_spoken)
        d = parse_amount(raw_op.amount_digits)

        amount_paise = None
        amount_check = "none"

        if s is None and d is None:
            if raw_op.intent in ("CREATE_TRANSACTION", "CORRECTION"):
                amount_check = "unparsed"
            else:
                amount_check = "none"
        elif s is not None and d is not None:
            if s == d:
                amount_paise = s
                amount_check = "ok"
            else:
                amount_paise = d
                amount_check = "mismatch"
        else:
            amount_paise = s if s is not None else d
            amount_check = "ok"

        b_date = None
        if raw_op.intent == "CREATE_TRANSACTION":
            b_date = resolve_date(raw_op.date_expression, context.now, context.shop)

        c_name = raw_op.customer_name if raw_op.customer_name and raw_op.customer_name.strip() else None
        c_choice = raw_op.choice if raw_op.choice and raw_op.choice.strip() else None
        d_expr = raw_op.date_expression if raw_op.date_expression and raw_op.date_expression.strip() else None
        amt_sp = raw_op.amount_spoken if raw_op.amount_spoken and raw_op.amount_spoken.strip() else None

        conf = max(0.0, min(1.0, float(raw_op.confidence)))

        ops.append(
            Operation(
                intent=raw_op.intent,
                customer_name=c_name,
                amount_spoken=amt_sp,
                amount_paise=amount_paise,
                amount_check=amount_check,
                direction=raw_op.direction,
                date_expression=d_expr,
                business_date=b_date,
                choice=c_choice,
                confidence=conf,
            )
        )

    lang = transcript.language or llm_output.language or shop_fallback_lang
    logger.info(f"interpret source=llm model={model_name} latency_ms={duration_ms}")
    return Interpretation(operations=ops, source="llm", language=lang)
