# Roshan Rozgar (روشن روزگار)

A hyper-local marketplace that connects households in Islamabad and Rawalpindi with nearby skilled trade workers: electricians, plumbers, AC technicians, carpenters, painters, mechanics, cleaners and more.

The worker side is built for people who may not read or type comfortably. A worker can create a complete profile by speaking, every question can be read aloud, and chat is voice-first. The whole interface is available in **English, Urdu (right-to-left) and Roman Urdu**.

Built for the CUI Tech Fest · AI Web Forge hackathon.

---

## How the five required outcomes are met

| Outcome | How |
|---|---|
| **Onboarding** without reading or typing | Sign-up is one short form with two ways to fill it: type, or **Answer by voice** — the app reads each question aloud, records the answer (stopping automatically when the person stops talking), transcribes it with **Groq Whisper** (Urdu, Roman Urdu or English), pulls out the value (name, trade, area, years, rate) and fills the form for review. No phone number, PIN or password. |
| **Discovery** of nearby, available workers | Workers are filtered by skill, distance between the customer's saved area and the worker's base area, the requested time (no clashing bookings; for "now" jobs the worker must be switched to Available), and ranked by rating, distance, experience and completed jobs. List and OpenStreetMap views. |
| **Communication** and price agreement | Real-time chat (Socket.IO) with voice notes (with optional transcript), photos, quick-reply chips, and structured **price offers** that the other side accepts or counters. Optional AI translation of messages when an AI key is configured. |
| **Booking** with consistent availability | The customer confirms exactly one worker per job. A conditional database update stops double booking; all other conversations for the job close automatically. A worker cannot accept or be booked into an overlapping slot. Free/busy status is derived from bookings every time it is read, so it never drifts. |
| **Trust** after the job | Two-way reviews: customer → worker (stars, tags, text or voice) and worker → customer (behaviour, communication, professionalism, overall). One review per person per job. Ratings, "most mentioned" tags (or an AI summary), completed jobs and repeat customers are shown on profiles. |

---

## Tech stack

- **Frontend:** React 18 + Vite 5, Tailwind CSS 3, React Router 6, Lucide React icons, Leaflet / React-Leaflet (OpenStreetMap tiles), Socket.IO client
- **Backend:** Node.js (ESM) + Express 4, Socket.IO 4, JWT device sessions (no passwords)
- **Database:** MongoDB via Mongoose 8, **or** a built-in demo JSON store when no MongoDB is configured (same data model, same services)
- **AI:** Groq API (Whisper speech-to-text + `openai/gpt-oss-120b` language model), optional Anthropic Claude API (`@anthropic-ai/sdk`), browser speech synthesis for read-aloud, MediaRecorder for recording

```
client/            React app (pages, components, i18n, hooks, services)
server/src/
  routes/          REST endpoints
  services/        booking, matching/availability, chat, reviews, AI, notifications
  db/              Mongoose schemas, MongoDB store, demo file store
  seed/            demo data
shared/            constants + language parsing used by both client and server
```

---

## Setup

Requirements: **Node.js 20+** (tested on Node 24) and npm. MongoDB is optional.

```bash
npm install
cp server/.env.example server/.env      # optional: edit values
npm run dev
```

- App: http://localhost:5173 (Vite dev server, proxies `/api`, `/uploads` and Socket.IO to the API)
- API: http://localhost:5000

On first start the server loads demo data automatically. To wipe everything and reload the demo data:

```bash
npm run seed
```

Production-style run (API serves the built client on one port):

```bash
npm run build
npm start          # http://localhost:5000
```

### Environment variables (`server/.env`)

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `JWT_SECRET` | Secret for login tokens. **Set this** for any shared deployment. |
| `MONGODB_URI` | MongoDB connection string. Empty → demo mode (`server/data/demo-db.json`). If MongoDB is unreachable the server falls back to demo mode and logs it. |
| `GROQ_API_KEY` | Enables server speech-to-text (Groq Whisper) and the language-model features below. |
| `GROQ_STT_MODEL` / `GROQ_LLM_MODEL` | Defaults `whisper-large-v3` / `openai/gpt-oss-120b`. |
| `ANTHROPIC_API_KEY` | Optional. If set, Claude is used for the language-model features instead of Groq. |
| `AI_MODEL` | Claude model id (default `claude-opus-5-5`). |
| `CLIENT_ORIGIN` | Allowed browser origin for CORS / Socket.IO. |

### Accounts (no phone number or PIN)

Sign-up is the profile form only. The account stays signed in on that device; after logging out, the login page shows **Continue as <name>** for every account used on the device (one tap). The seeded demo accounts — **Sara Ahmed** (customer, F-10) and **Ali Khan** (worker, electrician/AC, G-9) — have one-tap buttons on the login page too.

Suggested demo: tap the demo customer (Sara) → describe "Mujhe ghar mein electrician chahiye. Ek switch kharab hai" → confirm → send a request to a worker → open a second browser profile and tap the demo worker (Ali) → accept with a price → agree the price in chat → Sara confirms → Ali starts and completes → both review each other.

---

## AI services and what they do

| Feature | Service | Without it |
|---|---|---|
| Speech-to-text for sign-up answers, job descriptions, review text, chat voice-note transcripts and the worker's voice commands | **Groq Whisper** (`whisper-large-v3`, Urdu forced for Urdu/Roman speakers; Roman Urdu output is transliterated by the Groq language model) | Browser Web Speech API if available, otherwise typing |
| Read-aloud of questions, labels and the worker's own profile | **Browser speech synthesis** (Urdu voice if installed, otherwise Roman Urdu read by an English/Hindi voice) | Speaker buttons are hidden |
| Job understanding (category, urgency, title, when, budget, likely issue, English summary) | **Groq** `openai/gpt-oss-120b` (or Claude if `ANTHROPIC_API_KEY` is set), JSON validated with zod | Built-in keyword matcher for English, Urdu script and Roman Urdu. The UI says "Matched by keywords (AI not connected)". |
| Reading spoken answers (name, trade, area, years, rate) | Built-in rules first, **Groq/Claude** when rules find nothing | Rules only |
| Chat message translation (Urdu ↔ English ↔ Roman Urdu) | **Groq** (or Claude) | The Translate link says translation needs an AI key |
| Review summary on worker profiles | **Groq** (or Claude), cached until the review count changes | "Most mentioned by customers" tag counts |
| Worker ranking ("Best match") | Deterministic scoring (rating, distance, experience, jobs, sub-skill match). Not AI. | — |

The app never claims an AI result it did not get: every AI-derived value carries a `source` field and the UI labels it.

---

## What is seeded, simulated or mocked

- **Seeded (marked "Demo" in the UI):** 7 customers, 26 workers across 8 trades in 22 Islamabad/Rawalpindi areas, ~38 completed past jobs with reviews in English, Urdu and Roman Urdu, one job in progress (Imran Shah — shows as busy), one confirmed job tomorrow for Ali Khan, and one pending request from Usman to Ali. All names are invented.
- **Locations:** areas are fixed points (approximate sector centres). Distance is measured between saved areas, **not live GPS**. "Use my location" picks the nearest seeded area from the browser's geolocation.
- **Portfolio images** for seeded workers are flat illustrations labelled "Sample illustrations". Real users upload photos.
- **"Phone verified (demo)"** is a seeded flag. There is no SMS/OTP verification and no CNIC/government ID check (out of scope).
- **Payments:** none. The worker "Earnings" card only sums agreed prices of completed jobs and says so.
- **Calls:** not implemented; no phone numbers are collected and contact happens in chat.

---

## Known limitations

- Voice input needs microphone permission and an internet connection to Groq. Silence detection uses the input volume, so very noisy rooms may cut answers early (the person can tap stop or say it again).
- Accounts are tied to the device (no phone/PIN): clearing the browser data or switching phones means creating a new account.
- Read-aloud in Urdu script needs an Urdu system voice; otherwise the Roman Urdu text is read.
- Voice notes are uploaded as base64 JSON (max 6 MB, 2 minutes) and stored on the server's disk under `server/uploads/`.
- The demo JSON store is single-process. Double-booking protection is enforced with conditional updates in both stores, but the demo store is not meant for multiple server instances.
- The speech and extraction endpoints are open before sign-up, protected only by a simple per-IP rate limit.
- Worker search loads all workers of a category and filters in memory; fine for the seeded size, would need geo-indexes at scale.
- Booking slots use a fixed 2-hour duration.

---

## Credits and disclosure

- UI design: the team's Figma design (*Roshan Rozgar UI Design*). The hero photo-illustration is taken from that design.
- Open-source libraries: React, Vite, Tailwind CSS, React Router, Lucide icons, Leaflet & React-Leaflet, Socket.IO, Express, Mongoose, bcryptjs, jsonwebtoken, zod, Anthropic SDK.
- Map tiles © OpenStreetMap contributors. Fonts: Poppins, Inter and Noto Nastaliq Urdu (Google Fonts).
- **AI coding assistant:** this codebase was written with the help of Claude Code (Anthropic).
