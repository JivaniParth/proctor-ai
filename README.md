# ProctorAI

**Agentic Autonomous Exam Integrity System**

> ProctorAI continuously observes candidate behavior, reasons over events, generates explainable decisions, and assists human proctors — without rigid rules or high false positives.

---

## Table of Contents

- [Overview](#overview)
- [Pages & Features](#pages--features)
- [Backend API](#backend-api)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [XAI Scoring Engine](#xai-scoring-engine)
- [Privacy & Compliance](#privacy--compliance)
- [Design System](#design-system)

---

## Overview

ProctorAI is a full-stack browser-based exam proctoring system with three roles:

| Role | Interface | Route |
|------|-----------|-------|
| **Examiner** | Configure questions, time limits, and marks | `/setup` |
| **Student** | Take the monitored exam (camera + mic required) | `/exam` |
| **Invigilator** | Monitor all candidates live with XAI reasoning | `/dashboard` |

The system implements a 5-step autonomous agent loop:  
**Observe → Reason → Prioritize → Explain → Escalate**

The frontend operates **offline-first** — all monitoring events are buffered locally when the backend is unavailable and automatically synced when the connection is restored.

---

## Pages & Features

### 🏠 Landing Page — `/`
- Hero section with agent loop visualization
- Problem statistics section
- Solution feature cards (Computer Vision, XAI Engine, Screen Monitoring, Privacy-First, Real-Time Pipeline, Agentic Architecture)
- 4-step "How It Works" flow: Capture → Extract → Reason → Alert
- Target user segments: Universities, Government Recruitment, Certification Bodies, Corporate Hiring

---

### ⚙️ Exam Setup — `/setup` *(Examiner)*
- **Exam metadata**: exam name, exam ID/code, time limit (minutes), passing percentage
- **Dynamic question builder**: add, edit, delete, and reorder (↑↓) questions
- **Per-question config**: question text, up to 4 answer options, mark correct answer, set marks value
- **Input validation**: all fields checked before saving — errors listed inline
- **Live summary bar**: question count, total marks, duration updated as you type
- **Save & Apply**: writes to `localStorage` and syncs to backend (`POST /api/exam-config`)
- **Save & Launch**: saves config and navigates directly to `/exam`
- **Reset to Defaults**: clears custom config, reverts to 3 built-in algorithm questions
- **Config source banner**: shows whether config was loaded from server, device, or defaults

---

### 🎓 Exam Client — `/exam` *(Student)*

#### Pre-Exam Screen
- Displays exam name, ID, question count, duration, total marks from examiner config
- Config source banner: blue (server), amber (localStorage/offline), amber-warning (defaults)
- Full monitoring disclosure list (camera, microphone, gaze, keystrokes, tabs, clipboard, speech)
- **Mandatory consent checkbox** — "Begin Examination" is disabled until checked
- Consent checkbox links to `/privacy` (opens in new tab)

#### Permission Gate
- Requests `getUserMedia({ video: true, audio: true })`
- If **denied** → shows a blocking error screen with browser instructions
- Exam **cannot start** without both camera and microphone permissions

#### During Exam
- **Webcam live feed** — real `getUserMedia` camera stream displayed
- **Combined audio+video recording** — `MediaRecorder` with `audio:true` captures full session into a single `.webm` file
- **Question number canvas overlay** — `Q1`, `Q2`, etc. drawn in the **bottom-right corner** of the webcam feed via `requestAnimationFrame`, well clear of face/eye area
- **Gaze tracking** — sampled every 200ms; direction (center / left / right) shown live in top bar and System Status Panel (updated every 500ms)
- **Voice Activity Detection** — Web Audio API (`AnalyserNode`) polls microphone RMS every 250ms; sustained speech (>1.5s) fires a "Voice activity detected" alert with 5s cooldown between events
- **Keystroke content capture** — all printable characters (letters, numbers, symbols) typed anywhere in the browser are logged with timestamp and question number; modifier/function keys excluded
- **5-second pre-answer gaze capture** — on every Next/Submit click, last 5s of gaze readings flushed and logged per question
- **Red-flag face snapshot** — when tab switches ≥ 3 or paste events ≥ 2, a JPEG frame is captured from the webcam and stored as evidence
- **Countdown timer** — configured time limit; turns red in last 5 minutes; auto-submits on expiry
- **WebSocket event streaming** — all monitoring events sent to backend in real time; buffered in `localStorage` when offline, synced on reconnect
- **Per-question marks** shown on each question card
- **Question navigator** — jump to any question; green = answered, default = unanswered

#### System Status Panel (9 live indicators)
| Signal | Behavior |
|--------|----------|
| Webcam | Active / Denied |
| Microphone | Active / Denied |
| Gaze Tracking | Shows live direction (center/left/right) |
| Face Detection | Face present / absent |
| WebSocket | Connected / Syncing… / Offline (buffering) |
| Tab Switches | Running count (red if > 0) |
| Paste Events | Running count (red if > 0) |
| Keystrokes | Total count |
| Speech Events | Running count (red if > 0) |

#### Event Buffer
- Last 20 events with color-coded severity: green (ok), amber (warn), red (alert)
- Event types: gaze_away, tab_switch, paste, speech, snapshot, redFlag

#### Live Gaze Analysis Panel (collapsible)
- Per-question table: Center%, Left%, Right%, sample count, suspicious flag
- Suspicious = >30% of 5s window was non-center gaze

#### Submit Screen
- Questions answered / suspicious gaze count / tab switches summary
- **Consent Audit Trail** — timestamp, policy version, timezone, screen resolution
- **Red Flag Evidence** — JPEG snapshots captured at the moment of escalation with reason text
- **Download Combined Footage** — single `.webm` with both audio and video
- **Per-Question Gaze Analysis Table** — sortable, suspicious rows highlighted red
- **Keystroke Transcript** — per-question character sequences in monospace

#### Consent Audit Trail (stored at exam start)
```json
{
  "agreedAt": "2026-06-14T06:40:00.000Z",
  "examId": "EXAM-2026-001",
  "examName": "Advanced Algorithms — Final Examination",
  "userAgent": "Mozilla/5.0 ...",
  "language": "en-US",
  "timezone": "Asia/Kolkata",
  "screenRes": "1920x1080",
  "consentVersion": "1.0"
}
```
Stored in `localStorage` + `POST /api/consent` to backend.

---

### 📊 Invigilator Dashboard — `/dashboard` *(Proctor)*

#### Header & Stats Bar
- Exam name, exam ID, LIVE badge (pulsing)
- Summary counters: Total / Online / Flagged / Clean

#### Candidate Grid (left panel)
- 12 candidates sorted by risk score (highest first)
- Search + filter controls
- Each **Candidate Card** shows avatar, name, ID, connection status, severity badge, risk progress bar, event counts
- Live simulation: random events fire every 4 seconds on connected candidates

#### Candidate Detail Panel (right panel)
- Avatar, name, email, candidate ID
- **Risk Meter** — SVG circular gauge 0–100 with color-coded arc
- **Severity Badge** — CLEAN / LOW / AMBER / HIGH / RED
- Last active timestamp + connection status

#### Action Bar
| Button | Action |
|--------|--------|
| Send Warning | Adds warning flag to candidate's timeline |
| Flag for Review | Escalates risk score |
| Dismiss Flags | Resets all counts and flags |
| Export PDF | Downloads per-candidate integrity report (jsPDF) |
| Terminate Session | Appears only for RED severity |

#### XAI Reasoning Panel
- Human-readable explanation of why the candidate was flagged
- Signal breakdown table: signal, count, severity, score contribution
- Raw counters: tab switches, gaze-aways, face absences, pastes

#### Flag Timeline
- Chronological event list with icon, label, severity badge, timestamp
- Connected with vertical timeline line

#### Snapshot Review
- Grid of 4 webcam snapshots per candidate (captured every 30s)
- Flagged snapshots highlighted with red border

#### Export All
- Downloads full exam summary PDF for all 12 candidates

---

### 🔒 Privacy Policy — `/privacy`
- Full legal privacy policy with table of contents and section anchors
- Covers: audio recording, video recording, gaze tracking, keystroke content, browser events, consent trail, data storage/retention, student rights, contact
- Linked from the exam consent checkbox (opens in new tab)
- Linked from the navbar

---

## Backend API

Base URL: `http://localhost:8000`

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check + version |
| `GET` | `/health` | `{ status, db_active }` |
| `POST` | `/api/exam-config` | Save exam configuration (persists to DB if enabled) |
| `GET` | `/api/exam-config/{exam_id}` | Load exam configuration |
| `POST` | `/api/consent` | Record student consent audit trail |
| `GET` | `/api/consent/{exam_id}` | List consent records for exam |
| `GET` | `/admin/sessions/{exam_id}` | List all active candidate sessions |

### WebSocket Endpoints

| Path | Description |
|------|-------------|
| `ws://localhost:8000/ws/{exam_id}/{candidate_id}` | Candidate event stream |
| `ws://localhost:8000/ws/dashboard/{exam_id}` | Dashboard live broadcast receiver |

### Event Types Accepted
`gaze_away`, `gaze_center`, `gaze_left`, `gaze_right`, `face_absent`, `face_present`, `tab_switch`, `keystroke`, `paste`, `snapshot`, `speech`

### Database Activation
```bash
# Activate SQLite persistence
export PROCTORAI_USE_DB=true
export PROCTORAI_DB_PATH=proctorai.db   # optional, default: proctorai.db

uvicorn router:app --host 0.0.0.0 --port 8000 --reload
```
When `USE_DATABASE=false` (default), all DB methods are no-ops — the system runs fully without a database.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 19 (JSX — no TypeScript) |
| Build tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| State management | Zustand |
| Routing | React Router v7 |
| PDF export | jsPDF + jsPDF-AutoTable |
| Icons | Lucide React |
| Webcam + audio | Browser `getUserMedia` API |
| Recording | Browser `MediaRecorder` API (audio+video) |
| Speech detection | Web Audio API (`AnalyserNode`) |
| WebSocket client | Native browser WebSocket + localStorage buffer |
| Backend framework | FastAPI (Python) |
| Backend transport | WebSockets (uvicorn[standard]) |
| Database | SQLite via Python `sqlite3` (optional, flag-gated) |

---

## Project Structure

```
proctorai/
├── .gitignore                         # Root monorepo gitignore
├── README.md                          # ← you are here
├── backend/
│   ├── .gitignore
│   ├── router.py                      # FastAPI app — REST + WebSocket endpoints
│   ├── db.py                          # SQLite layer (USE_DATABASE flag)
│   ├── aggregator.py                  # 5-min rolling window event aggregation
│   ├── xai.py                         # Server-side XAI scoring engine
│   └── requirements.txt
└── frontend/
    ├── .gitignore
    ├── README.md
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── App.jsx                    # Routes: /, /dashboard, /exam, /setup, /privacy
        ├── main.jsx
        ├── index.css                  # Design tokens, animations
        ├── components/
        │   ├── ActionBar.jsx          # Warn / Flag / Dismiss / Export / Terminate
        │   ├── CandidateCard.jsx      # Risk card in dashboard grid
        │   ├── FlagTimeline.jsx       # Chronological event timeline
        │   ├── Navbar.jsx             # Home, Dashboard, Exam Client, Setup, Privacy
        │   ├── RiskMeter.jsx          # SVG circular gauge (0–100)
        │   ├── SeverityBadge.jsx      # CLEAN/LOW/AMBER/HIGH/RED pill
        │   ├── SnapshotReview.jsx     # Webcam snapshot grid
        │   └── XAIPanel.jsx           # Reasoning text + signal breakdown table
        ├── lib/
        │   ├── audioMonitor.js        # Speech detection via Web Audio API
        │   ├── exportPdf.js           # jsPDF candidate + exam summary reports
        │   ├── gazeTracker.js         # 5s circular gaze buffer (200ms sampling)
        │   ├── mockData.js            # 12 candidate mock profiles for dashboard
        │   ├── wsClient.js            # Offline-first WebSocket + apiGet/apiPost
        │   └── xai.js                 # Client-side XAI scoring engine
        ├── pages/
        │   ├── Dashboard.jsx          # Invigilator live monitoring dashboard
        │   ├── ExamClient.jsx         # Student exam: recording, gaze, keystrokes, consent
        │   ├── ExamSetup.jsx          # Examiner question builder
        │   ├── Landing.jsx            # Public landing page
        │   └── PrivacyPolicy.jsx      # Full legal privacy policy
        └── store/
            ├── dashboardStore.js      # Zustand: candidates, live updates, actions
            └── examStore.js           # Zustand: exam config + backend sync + localStorage
```

---

## Quick Start

### Frontend

```bash
cd proctorai/frontend
npm install
npm run dev
```

Open **http://localhost:5173**

| Page | URL |
|------|-----|
| Landing | http://localhost:5173/ |
| Exam Setup (Examiner) | http://localhost:5173/setup |
| Exam Client (Student) | http://localhost:5173/exam |
| Dashboard (Invigilator) | http://localhost:5173/dashboard |
| Privacy Policy | http://localhost:5173/privacy |

### Backend

```bash
cd proctorai/backend
pip install -r requirements.txt
uvicorn router:app --host 0.0.0.0 --port 8000 --reload
```

The frontend connects directly to `http://localhost:8000` and `ws://localhost:8000`.  
**The frontend works fully standalone without the backend** — events are buffered locally and synced automatically when the backend starts.

### Activate Database Persistence (optional)

```bash
# Windows PowerShell
$env:PROCTORAI_USE_DB="true"
uvicorn router:app --host 0.0.0.0 --port 8000 --reload
```

---

## XAI Scoring Engine

Deterministic, explainable scoring — no black-box ML. Score range: **0–100**.

| Signal | Amber threshold | Red threshold | Max weight |
|--------|----------------|---------------|------------|
| Tab switches | ≥ 1 | ≥ 3 | 35 pts |
| Gaze-aways | ≥ 3 | ≥ 10 | 30 pts |
| Face absences | ≥ 1 | ≥ 3 | 20 pts |
| Paste events | ≥ 1 | ≥ 2 | 10 pts |
| Odd keystrokes | ≥ 5 | ≥ 15 | 5 pts |

**Severity bands:**  
`CLEAN` (0) · `LOW` (1–19) · `AMBER` (20–44) · `HIGH` (45–69) · `RED` (70–100)

---

## Privacy & Compliance

ProctorAI collects the following during an exam session (all disclosed to the student via the privacy policy before the exam begins):

| Data | Purpose | Required |
|------|---------|----------|
| Webcam video | Identity verification, face presence | Yes |
| Microphone audio | Detect unauthorized verbal communication | Yes |
| Gaze direction | Detect looking away from screen | Yes |
| Keystroke characters | Detect unusual typing / external assistance | Yes |
| Tab switches | Detect navigation away from exam | Yes |
| Paste events | Detect pasted external content | Yes |
| Face presence | Verify student is in frame | Yes |
| Browser metadata | Consent audit trail | Yes |

**Consent audit trail** is recorded at the moment the student clicks "Begin Examination" (after checking the consent box) and stored in `localStorage` + transmitted to the backend.

**No data is automatically uploaded** — webcam footage stays as a browser Blob URL until manually downloaded.

Privacy Policy available at `/privacy` · Version 1.0 · Effective June 14, 2026

---

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--color-navy` | `#0D2B4E` | Primary brand, headers, buttons |
| `--color-navy-light` | `#1A3A5C` | Hover states |
| `--color-surface` | `#F7F9FC` | Page backgrounds |
| `--color-accent` | `#C41E3A` | CTAs, highlights |
| Font (sans) | Inter | Body text |
| Font (display) | Playfair Display | Hero headings |

---

*ProctorAI — Agentic Autonomous Exam Integrity System*
