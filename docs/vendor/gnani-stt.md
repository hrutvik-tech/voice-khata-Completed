# Gnani Prisma v3.0 Speech-to-Text Documentation

## Realtime Streaming STT
- Protocol: WebSocket (WSS)
- Endpoint: `wss://api.gnani.ai/stt/v3.0/streaming`
- Audio Format: 16 kHz, 16-bit signed little-endian PCM mono
- Frame size: Exactly 1,024 bytes per frame (512 samples)
- Connection Headers:
  - `x-api-key`: GNANI_API_KEY
  - `x-model`: STT_MODEL (`prisma-v3.0`)
  - `x-language`: comma-separated language hints (e.g. `hi-IN,en-IN`)
  - `x-format`: STT_FORMAT (`codemix` or standard)
  - `x-keyterms`: comma-separated custom dictionary terms (max 200)
  - `x-sample-rate`: 16000
  - `x-min-silence-ms`: STT_MIN_SILENCE_MS (e.g. 350)
  - `x-vad-threshold`: STT_VAD_THRESHOLD (e.g. 0.7)

### Handshake & Events
1. On connection established, server responds with `{"type": "connected"}`.
2. Client sends continuous binary audio frames of 1024 bytes.
3. Client sends text frame commit: `{"type": "commit"}` when user finishes speaking.
4. Server emits transcript segments: `{"type": "transcript", "text": "...", "language": "hi-IN", "latency_ms": 120, "is_final": true}`.
5. Client closes WebSocket or receives close.

## REST Transcription (Offline Sync)
- Endpoint: `POST https://api.gnani.ai/stt/v3.0/transcribe`
- Headers:
  - `x-api-key`: GNANI_API_KEY
  - `Content-Type`: `multipart/form-data`
- Parameters:
  - `audio`: audio file (WAV, 16 kHz mono 16-bit)
  - `language`: language hints
  - `keyterms`: keyterms comma-separated
- Response: `{"text": "...", "language": "hi-IN", "latency_ms": 250}`
