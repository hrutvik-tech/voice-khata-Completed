# Bolta Khata — Contracts

This document contains the complete contracts every module and prompt codes against.

## Contracts, Part 1: Structure, Settings and Data

### Repository and Owners
```
bolta-khata/
├── AGENTS.md                   M4
├── .gitignore, README.md       M4
├── docs/contracts.md           M4
├── docs/vendor/gnani-stt.md     M2
├── docs/vendor/gnani-tts.md     M2
├── docs/vendor/gemini.md        M3
├── test_data/audio/            M2 (WAV clips + expected.json)
├── test_data/sentences.json    M3 (text cases + expected operations)
├── frontend/
│   ├── package.json, vite.config.js, index.html, .env.example
│   ├── public/porcupine/ (suno_munshi.ppn, porcupine_params.pv)
│   ├── src/main.jsx, src/App.jsx
│   ├── src/pages/ (Login, Setup, Home, Customers, CustomerProfile, ShopProfile)
│   ├── src/components/
│   ├── src/store/appStore.js
│   ├── src/api/rest.js, mockRest.js
│   ├── src/test/
│   └── src/voice/ (useVoice.js, voiceStore.js, voiceSocket.js, wakeWord.js, frameTap.js, localVad.js, player.js, offlineQueue.js, mockVoice.js, voice.test.js)
└── backend/
    ├── requirements.txt, requirements-prod.txt, .env.example
    ├── app/main.py
    ├── app/core/config.py, tokens.py, crypto.py, retention.py
    ├── app/db/models.py, session.py, seed.py
    ├── app/schemas/contracts.py
    ├── app/api/ (auth, shop, customers, summary, sync, me, ws, debug)
    ├── app/services/ (providers, ledger, validation, conversation, orchestrator, replies)
    ├── app/speech/ (stt.py, tts.py, number_words.py, stub.py, cli.py)
    ├── app/ai/ (interpreter.py, prompts.py, fast_path.py, number_parser.py, matching.py, shop_clock.py, stub.py, eval.py)
    └── tests/ (conftest.py; m2/, m3/, m4/, integration/)
```

### Settings

#### `backend/.env.example`
```env
APP_ENV=dev # dev | prod
DEBUG=true # enables /debug routes and now_override
FRONTEND_ORIGIN=http://localhost:5173
DB_PATH=./data/khata.db
ENCRYPTION_MODE=fernet # fernet (laptops) | sqlcipher (Linux server)
DB_KEY= # Fernet key, or SQLCipher passphrase
JWT_SECRET=
JWT_EXPIRE_DAYS=30
USE_STUB_SPEECH=true # true until checkpoint I-2
USE_STUB_AI=true # true until checkpoint I-2
STUB_TRANSCRIPT=Ramesh Sharma ka 340 udhaar
GNANI_API_KEY=
STT_MODEL=prisma-v3.0
STT_FORMAT=codemix # locked by M2 in hour 0
STT_MIN_SILENCE_MS=350
STT_VAD_THRESHOLD=0.7
TTS_MODEL=timbre-v3.0
TTS_VOICE=
TTS_CONTAINER=mp3
LLM_PROVIDER=gemini # gemini | evon
GEMINI_API_KEY=
GEMINI_MODEL=
EVON_API_KEY=
TRANSCRIPT_RETENTION_HOURS=48
RUN_LIVE_TESTS=false # true runs tests that call Gnani and Gemini
```

#### `frontend/.env.example`
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_USE_MOCK_REST=true # false from checkpoint I-1
VITE_USE_MOCK_VOICE=true # false from checkpoint I-2
VITE_PICOVOICE_ACCESS_KEY= # browser-visible by design
VITE_DEMO_MODE=true # shows the demo-time control
```

Browser storage keys: `bk_token` (JWT), `bk_shop` (shop JSON). IndexedDB store for offline turns: `bk-offline`.

### Constants
- `AMEND_WINDOW_SECONDS`: 60
- `DUPLICATE_WINDOW_SECONDS`: 120
- `SESSION_IDLE_MINUTES`: 30
- `MAX_AMOUNT_PAISE`: 100000000 (₹10,00,000)
- Outlier rule: at least 3 earlier credits, and amount above 5 × median of the last 10 credits, and above 200000 paise
- `MIN_CONFIDENCE`: 0.6
- Name match same person: score >= 90
- Name match similar: score 75 to 89
- Default hours: open 06:00, close 02:00, Asia/Kolkata
- Business day: from opening time to next opening time
- Audio frame: 1,024 bytes = 512 samples, 16 kHz, signed 16-bit little-endian mono
- Local VAD: end after 600 ms of silence; turn cancelled if no speech within 5 s of wake word; maximum turn 12 s
- Wake-word sensitivity: 0.65
- LLM call: 4 s timeout, 1 retry
- Offline queue: at most 20 turns

Language codes: `hi`, `kn`, `en`. The shop's `language_mode` is `hi`, `kn`, `en` or `mix`.
STT hints: `hi` -> `hi-IN,en-IN`; `kn` -> `kn-IN,en-IN`; `en` -> `en-IN`; `mix` -> `hi-IN,kn-IN,en-IN`.
Reply language: detected language of speech, otherwise shop's language (`mix` falls back to `hi`).

### Seed Data (The Demo Shop)
Shop: owner "Sharma", shop "Sharma Kirana Store", phone 9000000001, PIN 1234, 06:00 to 02:00, language mix, setup complete.
Customers (Seed credit dated 7 business days before now, 18:00):
- Ramesh Sharma: Gandhi Nagar, 50000 paise (₹500)
- Ramesh Gupta: Station Road, 80000 paise (₹800)
- Suresh: None, 25000 paise (₹250)
- Amit: None, 0 paise (₹0)

### Data Models (SQLAlchemy 2, SQLite)
1. **shops**:
   - `id` (int, pk)
   - `owner_name`
   - `shop_name`
   - `phone` (unique, 10 digits)
   - `pin_hash`
   - `open_time` ("HH:MM")
   - `close_time` ("HH:MM")
   - `timezone` (default "Asia/Kolkata")
   - `language_mode`
   - `setup_complete` (bool, default false)
   - `created_at`

2. **customers**:
   - `id` (int, pk)
   - `shop_id` (fk)
   - `name`
   - `name_key` (normalized by M3's normalize_name)
   - `phone` (nullable, encrypted text)
   - `area` (nullable)
   - `source` ("voice" or "manual")
   - `created_at`

3. **transactions**:
   - `id` (int, pk)
   - `shop_id` (fk)
   - `customer_id` (fk)
   - `amount_paise` (int, check > 0)
   - `direction` ("credit" or "payment")
   - `business_date` (date)
   - `recorded_at` (timezone-aware datetime, stored as UTC)
   - `status` ("active" or "undone")
   - `source` ("voice", "offline" or "seed")
   - `language` (nullable)
   - `raw_transcript` (nullable, encrypted text)
   - `session_id` (nullable)
   - `idempotency_key` (unique)
   - `created_at`

4. **correction_history**:
   - `id` (int, pk)
   - `transaction_id` (fk)
   - `action` ("amend" or "undo")
   - `old_amount_paise`
   - `new_amount_paise` (nullable)
   - `session_id`
   - `at`

5. **conversation_sessions**:
   - `id` (uuid string, pk)
   - `shop_id` (fk)
   - `state`
   - `last_txn_id` (nullable)
   - `last_txn_at` (nullable)
   - `pending_json` (nullable text)
   - `disclosed` (bool, default false)
   - `last_language` (nullable)
   - `expires_at`
   - `updated_at`

Balance = sum of active credits minus sum of active payments for that customer.

---

## Contracts, Part 2: How the Parts Talk

### WebSocket: `/ws?token=<JWT>`

Website -> Backend:
- `{"type":"turn_start","turn_id":"<uuid>","now_override":null}`
- `<binary frames: exactly 1,024 bytes of PCM each>`
- `{"type":"commit","turn_id":"<uuid>"}`
- `{"type":"cancel","turn_id":"<uuid>"}`
- `{"type":"choose","turn_id":"<uuid>","choice":{"customer_id":2}}`
- `{"type":"choose","turn_id":"<uuid>","choice":{"answer":"yes"}}`
- `{"type":"ping"}`

Backend -> Website:
- `{"type":"ready","session_id":"<uuid>","shop_id":1}`
- `{"type":"state","state":"resting"}` (resting | listening | understanding | asking | speaking)
- `{"type":"heard","turn_id":"..","text":"..","language":"hi"}`
- `{"type":"entry","turn_id":"..","entry":{"id":41,"customer_id":1,"customer_name":"..","amount_paise":34000,"direction":"credit","business_date":"2026-11-21","recorded_at":"...","status":"new","old_amount_paise":null,"language":"hi"},"balance_paise":84000,"new_customer":false}`
- `{"type":"question","turn_id":"..","kind":"choose_customer","say":"..","options":[{"id":"1","label":".."}]}`
- `{"type":"not_understood","turn_id":"..","say":".."}`
- `{"type":"answer","turn_id":"..","kind":"entry_saved","say":"..","data":{}}`
- `{"type":"audio_start","turn_id":"..","format":"mp3"}`
- `<binary audio chunks>`
- `{"type":"audio_end","turn_id":".."}`
- `{"type":"error","turn_id":"..","code":"stt_failed","say":".."}`
- `{"type":"not_saved","turn_id":"..","text":"..","say":".."}`
- `{"type":"pong"}`

### REST Routes
- `GET /health` -> `{"ok": true}`
- `POST /auth/register` `{"owner_name","phone","pin"}` -> 201 `{"token","shop"}` (409 if phone exists)
- `POST /auth/login` `{"phone","pin"}` -> `{"token","shop"}` (401 on wrong PIN)
- `PUT /auth/pin` `{"old_pin","new_pin"}` -> 204 (401 on wrong old PIN)
- `GET /shop` -> `shop`
- `PUT /shop` `{"shop_name","open_time","close_time","language_mode"}` -> `shop` (sets `setup_complete=true`)
- `GET /customers?search=` -> `[{"id","name","phone","area","balance_paise","last_activity_at"}]`
- `POST /customers` `{"name","phone":null,"area":null,"confirm":false}` -> 201 `{"customer"}` or 409 `{"detail":"similar_exists","similar":[{"id","name","area"}]}`
- `GET /customers/{id}` -> `{"customer","balance_paise","entries":[...]}`
- `GET /summary/today` -> `day_summary data`
- `POST /sync/audio` multipart: audio (WAV, 16 kHz mono), idempotency_key, recorded_at -> `{"turn_id","events":[...]}`
- `DELETE /me` -> 204
- `POST /debug/turn` `{"text","now":null,"session_id":null}` -> `{"session_id","turn_id","events":[...]}`
- `POST /debug/choose` `{"session_id","turn_id","choice","now":null}` -> `{"events":[...]}`
- `POST /debug/reset` `{"now":null}` -> 204

### Reply Templates Table
- `disclosure`: (hi) "नमस्ते, मैं मुंशी हूँ, एक AI सहायक।" | (en) "Hello, I'm Munshi, an AI assistant." | (kn) "ನಮಸ್ಕಾರ, ನಾನು ಮುನ್ಷಿ, ಒಬ್ಬ AI ಸಹಾಯಕ."
- `entry_credit`: (hi) "{name} के खाते में {amount} उधार लिख दिया। कुल बाकी {balance}।" | (en) "Added {amount} credit for {name}. Balance {balance}." | (kn) "{name} ಅವರ ಖಾತೆಗೆ {amount} ಸಾಲ ಬರೆಯಲಾಗಿದೆ. ಒಟ್ಟು ಬಾಕಿ {balance}."
- `entry_payment`: (hi) "{name} से {amount} जमा लिया। कुल बाकी {balance}।" | (en) "Received {amount} from {name}. Balance {balance}." | (kn) "{name} ಅವರಿಂದ {amount} ಸ್ವೀಕರಿಸಲಾಗಿದೆ. ಒಟ್ಟು ಬಾಕಿ {balance}."
- `entry_amended`: (hi) "ठीक है, {name} की एंट्री बदलकर {amount} कर दी। कुल बाकी {balance}।" | (en) "Changed {name}'s entry to {amount}. Balance {balance}." | (kn) "ಸರಿ, {name} ಅವರ ನಮೂದನ್ನು {amount} ಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ. ಒಟ್ಟು ಬಾಕಿ {balance}."
- `entry_undone`: (hi) "{name} की {amount} वाली एंट्री हटा दी। कुल बाकी {balance}।" | (en) "Removed {name}'s {amount} entry. Balance {balance}." | (kn) "{name} ಅವರ {amount} ನಮೂದನ್ನು ತೆಗೆದುಹಾಕಲಾಗಿದೆ. ಒಟ್ಟು ಬಾಕಿ {balance}."
- `entries_many`: (hi) "{count} एंट्री लिख दीं।" | (en) "Saved {count} entries." | (kn) "{count} ನಮೂದುಗಳನ್ನು ದಾಖಲಿಸಲಾಗಿದೆ."
- `new_customer_prefix`: (hi) "नया ग्राहक {name} जोड़ा। " | (en) "Added new customer {name}. " | (kn) "ಹೊಸ ಗ್ರಾಹಕ {name} ಸೇರಿಸಲಾಗಿದೆ. "
- `balance`: (hi) "{name} का कुल बाकी {balance} है।" | (en) "{name} owes {balance}." | (kn) "{name} ಅವರ ಒಟ್ಟು ಬಾಕಿ {balance} ಆಗಿದೆ."
- `balance_zero`: (hi) "{name} का कोई बाकी नहीं है।" | (en) "{name} owes nothing." | (kn) "{name} ಅವರ ಯಾವುದೇ ಬಾಕಿ ಇಲ್ಲ."
- `balance_advance`: (hi) "{name} का {balance} एडवांस जमा है।" | (en) "{name} has {balance} paid in advance." | (kn) "{name} ಅವರ {balance} ಮುಂಗಡ ಹಣವಿದೆ."
- `daily_total`: (hi) "आज कुल {amount} उधार गया।" | (en) "Total credit today is {amount}." | (kn) "ಇಂದು ಒಟ್ಟು {amount} ಸಾಲ ನೀಡಲಾಗಿದೆ."
- `day_summary`: (hi) "आज {credit} उधार गया और {payment} जमा आया। सबसे ज़्यादा बाकी: {top}।" | (en) "Today {credit} went on credit and {payment} came in. Highest balances: {top}." | (kn) "ಇಂದು {credit} ಸಾಲ ನೀಡಲಾಗಿದೆ ಮತ್ತು {payment} ಜಮಾ ಆಗಿದೆ. ಹೆಚ್ಚು ಬಾಕಿ: {top}."
- `choose_customer`: (hi) "कौन से? {options}?" | (en) "Which one: {options}?" | (kn) "ಯಾವ ಗ್ರಾಹಕರು? {options}?"
- `confirm_similar`: (hi) "क्या आपका मतलब {name} है?" | (en) "Do you mean {name}?" | (kn) "ನಿಮ್ಮ ಉದ್ದೇಶ {name} ಅವರೇ?"
- `confirm_amount`: (hi) "{amount}, सही है? हाँ या ना बोलिए।" | (en) "Is {amount} right? Say yes or no." | (kn) "{amount}, ಸರಿಯಾಗಿದೆಯೇ? ಹೌದು ಅಥವಾ ಇಲ್ಲ ಎಂದು ಹೇಳಿ."
- `confirm_direction`: (hi) "{name} का {amount} उधार है या जमा?" | (en) "Is {name}'s {amount} credit or payment?" | (kn) "{name} ಅವರ {amount} ಸಾಲವೇ ಅಥವಾ ಜಮಾವೇ?"
- `confirm_duplicate`: (hi) "{name} का {amount} अभी लिखा था। दोबारा लिखूँ?" | (en) "I just saved {amount} for {name}. Save it again?" | (kn) "{name} ಅವರಿಗೆ {amount} ಈಗಷ್ಟೇ ಬರೆಯಲಾಗಿತ್ತು. ಮತ್ತೆ ಬರೆಯಲೇ?"
- `confirm_amend`: (hi) "{name} की पिछली एंट्री बदलकर {amount} कर दूँ?" | (en) "Change {name}'s last entry to {amount}?" | (kn) "{name} ಅವರ ಹಿಂದಿನ ನಮೂದನ್ನು {amount} ಗೆ ಬದಲಾಯಿಸಬೇಕೆ?"
- `confirm_undo`: (hi) "{name} की {amount} वाली एंट्री हटा दूँ?" | (en) "Remove {name}'s {amount} entry?" | (kn) "{name} ಅವರ {amount} ನಮೂದನ್ನು ತೆಗೆದುಹಾಕಬೇಕೆ?"
- `cancelled`: (hi) "ठीक है, कुछ नहीं लिखा।" | (en) "Okay, nothing saved." | (kn) "ಸರಿ, ಏನನ್ನೂ ಬರೆಯಲಾಗಿಲ್ಲ."
- `not_understood`: (hi) "समझ नहीं आया, दोबारा बोलिए।" | (en) "I didn't catch that, please say it again." | (kn) "ಅರ್ಥವಾಗಲಿಲ್ಲ, ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳಿ."
- `nothing_to_undo`: (hi) "हटाने के लिए कोई एंट्री नहीं है।" | (en) "There's no entry to remove." | (kn) "ತೆಗೆದುಹಾಕಲು ಯಾವುದೇ ನಮೂದು ಇಲ್ಲ."
- `customer_not_found`: (hi) "{name} नाम का कोई ग्राहक नहीं मिला।" | (en) "No customer named {name}." | (kn) "{name} ಹೆಸರಿನ ಯಾವುದೇ ಗ್ರಾಹಕರು ಸಿಗಲಿಲ್ಲ."
- `not_saved`: (hi) "ऑफलाइन एंट्री सेव नहीं हुई, दोबारा बोलिए।" | (en) "An offline entry wasn't saved. Please say it again." | (kn) "ಆಫ್‌ಲೈನ್ ನಮೂದು ಉಳಿಸಲಾಗಿಲ್ಲ, ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳಿ."
- `stt_failed`: (hi) "आवाज़ नहीं पहुँची, दोबारा बोलिए।" | (en) "The voice didn't come through. Please say it again." | (kn) "ಧ್ವನಿ ತಲುಪಲಿಲ್ಲ, ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳಿ."
