# Google Gemini Structured Output & Reasoning

## google-genai Async Client
- SDK: `google-genai`
- Models: `gemini-2.5-flash` or `gemini-2.0-flash`
- Features: Structured JSON output with Pydantic schema (`response_schema`), low thinking level (`thinking_config={"thinking_budget": 0}` or low).
- System instruction: Set via config `system_instruction`.
- Strict schema validation for operations.
