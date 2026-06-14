# ProctorAI

**Agentic Autonomous Exam Integrity System**

> ProctorAI continuously observes candidate behavior, reasons over events, generates explainable decisions, and assists human proctors — without rigid rules or high false positives.

---

## Table of Contents

- [Overview](#overview)
- [Pages & Features](#pages--features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Design System](#design-system)

---

## Overview

ProctorAI is a browser-based exam proctoring system with three roles:

| Role | Interface | Route |
|------|-----------|-------|
| **Examiner** | Configure questions, time, and marks | `/setup` |
| **Student** | Take the monitored exam | `/exam` |
| **Invigilator** | Monitor candidates live | `/dashboard` |

The system implements a 5-step autonomous agent loop: **Observe → Reason → Prioritize → Explain → Escalate**

---

## Pages & Features

### 🏠 Landing Page — `/`
- Hero section with agent loop visualization
- Problem stats (76% cheating rate, $3B+ global cheating industry)
- Solution feature cards: Computer Vision, XAI Engine, Screen Monitoring, Privacy-First, Real-Time Pipeline, Agentic Architecture
- 4-step "How It Works" flow: Capture → Extract → Reason → Alert
- Target user segments: Universities, Government, Certification Bodies, Corporate

---

### ⚙️ Exam Setup — `/setup`  *(Examiner)*
- **Exam metadata**: exam name, exam ID/code, time limit (minutes), passing percentage
- **Dynamic question builder**: add, edit, delete, and reorder questions with ↑↓ controls
- **Per-question config**: question text, up to 4 answer options, mark the correct answer, set marks value
- **Validation**: all fields are checked before saving — errors listed inline
- **Live summary bar**: question count, total marks, duration updated as you type
- **Save & Apply**: persists config to `localStorage` — survives page reloads
- **Save & Launch**: saves + immediately navigates to `/exam`
- **Reset to Defaults**: clears custom config, reverts to built-in questions
- If no examiner config is set, the Exam Client automatically falls back to 3 default algorithm questions

---

### 🎓 Exam Client — `/exam`  *(Student)*

#### Pre-exam Screen
- Shows exam name, ID, question count, duration, and total marks from examiner config
- Info banner: blue if custom config loaded, amber if using defaults (with link to `/setup`)
- Webcam & monitoring consent checklist

#### During Exam
- **Webcam live feed** — actual browser camera via `getUserMedia`
- **Question number overlay** — `Q1`, `Q2`, etc. drawn on the webcam canvas in the **bottom-right corner** (away from face/eyes) in real time via `requestAnimationFrame`
- **Continuous gaze tracking** — sampled every 200ms; direction (center / left / right) updated every 500ms in the System Status Panel and top bar
- **Gaze variance on interaction** — clicking an answer, Next, or Submit spikes gaze variance for 2 seconds to simulate realistic behavior under cognitive load
- **5-second pre-answer gaze capture** — on every Next / Submit click, the last 5 seconds of gaze readings are flushed and logged per question
- **Question navigator** — click any Q number to jump; green = answered, default = unanswered
- **Countdown timer** — counts down from the configured time limit; turns red in the last 5 minutes; auto-submits on expiry
- **Per-question marks** shown on each question card
- **MediaRecorder recording** — webcam is recorded continuously from Start → Submit into a single `.webm` file (combined footage)

#### System Status Panel
| Signal | What it shows |
|--------|---------------|
| Webcam | Camera active / denied |
| Gaze Tracking | Live direction: center / left / right |
| Face Detection | Face present status |
| WebSocket | Backend connection state |
| Tab Switches | Running count (flagged in red if > 0) |
| Paste Events | Running count (flagged in red if > 0) |
| Keystrokes | Running count |

#### Event Buffer
- Last 15 events displayed with color-coded severity: green (ok), amber (warn), red (alert)
- Events: gaze_away, tab_switch, paste, snapshot, error

#### Live Behavior Analysis Panel (collapsible)
- Per-question gaze summary recorded as each question is answered
- Columns: Q#, Center%, Left%, Right%, Samples, Flag (✓ Clean / ⚠ Suspicious)
- `Suspicious = true` if >30% of the 5s window was non-center gaze

#### Submit Screen
- Summary: questions answered, suspicious gaze events count, tab switches
- **Download Combined Gaze Footage** — single `.webm` covering the full exam session
- **Full Per-Question Gaze Analysis Table** — sortable by question number, suspicious rows highlighted red

---

### 📊 Invigilator Dashboard — `/dashboard`  *(Proctor)*

#### Header & Stats Bar
- Exam name, exam ID, LIVE badge (pulsing red dot)
- Summary counters: Total / Online / Flagged / Clean

#### Candidate Grid (left panel)
- 12 candidates sorted by risk score (highest first)
- Search bar + filter button
- Each **Candidate Card** shows: avatar initials, name, ID, WiFi status, severity badge, risk progress bar, event count
- Live simulation: every 4 seconds a random event fires on a random connected candidate

#### Candidate Detail Panel (right panel — click any card)
- Avatar, name, email, candidate ID
- **Risk Meter** — SVG circular gauge 0–100 with color-coded arc (green → blue → amber → orange → red)
- **Severity Badge** — CLEAN / LOW / AMBER / HIGH / RED
- Last active timestamp + connection status

#### Action Bar
| Button | Action |
|--------|--------|
| Send Warning | Adds a warning flag to candidate's timeline |
| Flag for Review | Increases risk score (simulates escalation) |
| Dismiss Flags | Resets all counts and flags for the candidate |
| Export PDF | Downloads per-candidate integrity report |
| Terminate Session | Appears only for RED severity candidates |

#### XAI Reasoning Panel
- Autonomous assessment text (human-readable explanation)
- Signal breakdown table: signal name, count, severity (AMBER/RED), score contribution
- Raw signal counters: Tab Switches, Gaze Aways, Face Absences, Pastes

#### Flag Timeline
- Chronological list of all flag events with icon, label, severity badge, timestamp
- Connected with a vertical timeline line

#### Snapshot Review
- Grid of 4 webcam snapshots per candidate (captured every 30s)
- Flagged snapshots highlighted with red border + "Flagged" badge

#### Export All
- Downloads full exam summary PDF for all candidates

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
| Webcam | Browser `getUserMedia` API |
| Recording | Browser `MediaRecorder` API |
| Backend | Python, FastAPI, WebSockets |

---

## Project Structure

```
proctorai/
├── .gitignore                     # Root monorepo gitignore
├── README.md                      # ← you are here
├── backend/
│   ├── .gitignore
│   ├── router.py                  # FastAPI WebSocket server
│   ├── aggregator.py              # 5-min rolling window aggregation
│   ├── xai.py                     # Server-side XAI engine
│   └── requirements.txt
└── frontend/
    ├── .gitignore
    ├── README.md
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── App.jsx                # Routes: /, /dashboard, /exam, /setup
        ├── main.jsx
        ├── index.css              # Design tokens, animations
        ├── components/
        │   ├── ActionBar.jsx      # Warn / Flag / Dismiss / Export buttons
        │   ├── CandidateCard.jsx  # Risk card in dashboard grid
        │   ├── FlagTimeline.jsx   # Chronological event timeline
        │   ├── Navbar.jsx         # Sticky top navigation
        │   ├── RiskMeter.jsx      # SVG circular gauge
        │   ├── SeverityBadge.jsx  # CLEAN/LOW/AMBER/HIGH/RED pill
        │   ├── SnapshotReview.jsx # Webcam snapshot grid
        │   └── XAIPanel.jsx       # Reasoning + signal breakdown
        ├── lib/
        │   ├── exportPdf.js       # jsPDF report generation
        │   ├── gazeTracker.js     # 5s circular gaze buffer + sampling
        │   ├── mockData.js        # 12 candidate mock profiles
        │   └── xai.js             # Client-side XAI scoring engine
        ├── pages/
        │   ├── Dashboard.jsx      # Invigilator live dashboard
        │   ├── ExamClient.jsx     # Student exam interface + recording
        │   ├── ExamSetup.jsx      # Examiner question builder
        │   └── Landing.jsx        # Public marketing page
        └── store/
            ├── dashboardStore.js  # Zustand: candidates, live updates
            └── examStore.js       # Zustand: exam config + localStorage
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
| Exam Setup | http://localhost:5173/setup |
| Exam Client | http://localhost:5173/exam |
| Dashboard | http://localhost:5173/dashboard |

### Backend (optional — for live WebSocket mode)

```bash
cd proctorai/backend
pip install -r requirements.txt
uvicorn router:app --host 0.0.0.0 --port 8000 --reload
```

The frontend Vite dev server proxies `/api` and `/ws` to `localhost:8000` automatically.

---

## XAI Scoring Engine

The client-side XAI engine scores candidates from **0–100** using a weighted rule system:

| Signal | Amber threshold | Red threshold | Max weight |
|--------|----------------|---------------|------------|
| Tab switches | ≥ 1 | ≥ 3 | 35 pts |
| Gaze-aways | ≥ 3 | ≥ 10 | 30 pts |
| Face absences | ≥ 1 | ≥ 3 | 20 pts |
| Paste events | ≥ 1 | ≥ 2 | 10 pts |
| Odd keystrokes | ≥ 5 | ≥ 15 | 5 pts |

Severity bands: **CLEAN** (0) · **LOW** (1–19) · **AMBER** (20–44) · **HIGH** (45–69) · **RED** (70–100)

---

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--color-navy` | `#0D2B4E` | Primary brand, headers |
| `--color-surface` | `#F7F9FC` | Page background |
| `--color-accent` | `#C41E3A` | CTAs, highlights |
| Font (sans) | Inter | Body text |
| Font (display) | Playfair Display | Headings |

---

*ProctorAI — Agentic Autonomous Exam Integrity System*
