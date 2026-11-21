# Gnani Timbre v3.0 Text-to-Speech Documentation

## Realtime Streaming TTS
- Protocol: WebSocket (WSS)
- Endpoint: `wss://api.gnani.ai/tts/v3.0/streaming`
- Headers:
  - `x-api-key`: GNANI_API_KEY
  - `x-model`: TTS_MODEL (`timbre-v3.0`)
  - `x-voice`: TTS_VOICE
  - `x-container`: TTS_CONTAINER (`mp3`)
  - `x-sample-rate`: 16000

### Request & Streaming
- Client sends: `{"action": "synthesize", "text": "...", "language": "hi"}`
- Server streams binary audio frames (`audio/mpeg`).
- Server sends text completion frame: `{"type": "done"}` or `{"type": "completed"}`.
- Stock voices available: `priya_hi`, `rahul_hi`, `ananya_kn`, `rajesh_kn`, `arun_en`.
