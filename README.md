# Bolta Khata — बोलता खाता

> **A mobile-first, voice-controlled digital ledger for Indian kirana shopkeepers.**

Shopkeepers can speak naturally in **Hindi**, **Kannada**, **English**, or **mixed languages (Hinglish/Kanglish)**, say *"Suno Munshi"*, and have their ledger updated instantly with spoken confirmation in under 2 seconds.

---

## 🌟 Key Features

1. **Natural Voice Interaction & Wake Word**:
   - Wake phrase: **"Suno Munshi"** via Picovoice Porcupine (with a one-click manual fallback when running without local model assets).
   - Real-time speech-to-text via Gnani Prisma v3.0 (streaming 16 kHz mono signed 16-bit PCM in 1,024-byte frames).
   - Natural spoken replies using Gnani Timbre v3.0 stock voices.
2. **AI Interpretation & Deterministic Ledger**:
   - Google Gemini AI (via `google-genai`) proposes structured operations.
   - Deterministic fast-path interpreter for low-latency zero-LLM command resolution.
   - Deterministic multi-lingual number parser supporting Hindi, Kannada, English, Devanagari, and colloquial shorthand (e.g., *"three forty"* = ₹340).
   - Shop-Clock enforcing business day cycles (06:00 to 02:00 next day Asia/Kolkata).
   - Strict rule: **Money is always integer paise**; floats are never used.
3. **Core Ledger Rules**:
   - **Credit ("Udhaar")** and **Payment ("Jama")** entries.
   - **Amendments & Corrections**: *"Nahi, 430"* within the 60-second amendment window.
   - **Undo**: *"Pichla hatao"* marks entries as undone without erasing history.
   - **Duplicate Detection**: Flags identical entries within 120 seconds.
   - **Interactive Clarification**: Prompts when customer names are ambiguous or amounts are outliers.
4. **Offline Resilience**:
   - IndexedDB (`bk-offline`) queue storing up to 20 offline turns.
   - Automatically synchronizes audio recordings when back online via `/sync/audio`.
5. **Mobile-First User Interface**:
   - Built with React, Vite, Tailwind CSS, and Zustand.
   - Large animated microphone orb with 5 states: *Resting*, *Listening*, *Understanding*, *Asking*, *Speaking*.
   - All 6 screens: **Login**, **Shop Setup**, **Home Dashboard**, **Customers Ledger**, **Customer Profile**, and **Shopkeeper Profile**.

---

## 🏗️ Technology Stack

- **Frontend**: React 18, Vite 6, Tailwind CSS v4, React Router v6, Zustand, IndexedDB (`idb-keyval`), Vitest, React Testing Library.
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2, SQLite, Pydantic v2, WebSockets, PyJWT, bcrypt, cryptography (Fernet).
- **AI & Speech**: Google Gemini (`google-genai`), RapidFuzz, Gnani Prisma v3.0 STT, Gnani Timbre v3.0 TTS, Picovoice Porcupine.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- Git

### 2. Backend Setup & Run

```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv .venv
# On Windows: .venv\Scripts\activate
# On Linux/macOS: source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Run FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will start at `http://localhost:8000`. You can verify health at `http://localhost:8000/health`.

### 3. Frontend Setup & Run

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🔑 Demo Shop Credentials

Bolta Khata comes pre-configured with a standard demo shop:
- **Phone**: `9000000001`
- **PIN**: `1234`
- **Shop Name**: Sharma Kirana Store
- **Owner**: Sharma

### Seed Customers:
- **Ramesh Sharma** (Gandhi Nagar) — Starting balance: ₹500 (50,000 paise)
- **Ramesh Gupta** (Station Road) — Starting balance: ₹800 (80,000 paise)
- **Suresh** — Starting balance: ₹250 (25,000 paise)
- **Amit** — Starting balance: ₹0 (0 paise)

---

## 🧪 Testing

### Backend Tests (29 tests)
Includes unit tests for crypto, retention, STT/TTS frame validation, number parsing, matching, fast-path, database bootstrap, ledger services, orchestrator multi-turn flow, and the complete 16-step integration judge script:

```bash
cd backend
python -m pytest -q
```

### Frontend Tests (7 tests)
Includes unit tests for audio FrameTap (1024-byte chunks), LocalVad energy detection, AudioPlayer stream handling, IndexedDB offline queue, and Login validation:

```bash
cd frontend
npm test
```

### Build Production Bundle
```bash
cd frontend
npm run build
```

---

## 📂 Project Structure

```
voice-kata/
├── README.md
├── AGENTS.md
├── .gitignore
├── docs/
│   ├── contracts.md             # Full system contracts & API specs
│   └── vendor/                  # Vendor documentation (Gnani STT/TTS, Gemini)
├── test_data/
│   ├── sentences.json           # 30 multilingual test evaluation sentences
│   └── audio/                   # Audio expected schemas
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── pages/               # Login, Setup, Home, Customers, CustomerProfile, ShopProfile
│   │   ├── components/          # MicOrb, TransactionEntry, VoiceQuestion, OfflineBanner, DemoTimeBar
│   │   ├── store/               # Zustand appStore.js
│   │   ├── api/                 # rest.js, mockRest.js
│   │   ├── voice/               # useVoice, voiceSocket, wakeWord, localVad, frameTap, player, offlineQueue
│   │   └── test/                # Vitest test specs & setup
├── backend/
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── core/                # config, tokens, crypto, retention
│   │   ├── db/                  # models, session, seed
│   │   ├── schemas/             # Pydantic contract schemas
│   │   ├── ai/                  # fast_path, interpreter, number_parser, matching, shop_clock
│   │   ├── speech/              # stt, tts, number_words, stub
│   │   ├── services/            # orchestrator, ledger, conversation, validation, replies
│   │   └── api/                 # auth, shop, customers, summary, sync, me, ws, debug
│   └── tests/                   # m2, m3, m4, and integration judge script
```

---

## 📜 License
Bolta Khata is developed for Indian kirana shopkeepers. All rights reserved.
