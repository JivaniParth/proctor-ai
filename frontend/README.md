# ProctorAI — Frontend

React + Vite frontend for the ProctorAI Agentic Exam Integrity System.  
Built with **React 19 (JSX)**, **Tailwind CSS v4**, **Zustand**, and **Vite 8**.

---

## Getting Started

```bash
npm install
npm run dev      # development server → http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview production build
```

---

## Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Landing.jsx` | Marketing page — problem, solution, architecture |
| `/setup` | `ExamSetup.jsx` | Examiner configures questions, time & marks |
| `/exam` | `ExamClient.jsx` | Student exam interface with live monitoring |
| `/dashboard` | `Dashboard.jsx` | Invigilator live monitoring dashboard |

---

## Source Structure

```
src/
├── App.jsx               # BrowserRouter + 4 routes
├── main.jsx              # React root mount
├── index.css             # Tailwind + custom design tokens + animations
│
├── components/
│   ├── ActionBar.jsx     # Warn / Flag / Dismiss / Export / Terminate buttons
│   ├── CandidateCard.jsx # Clickable risk card with progress bar
│   ├── FlagTimeline.jsx  # Vertical event timeline with icons
│   ├── Navbar.jsx        # Sticky nav: Home, Dashboard, Exam Client, Setup
│   ├── RiskMeter.jsx     # SVG circular gauge (0–100, color-coded)
│   ├── SeverityBadge.jsx # Pill badge: CLEAN/LOW/AMBER/HIGH/RED
│   ├── SnapshotReview.jsx# 2-column webcam snapshot grid
│   └── XAIPanel.jsx      # Reasoning text + signal breakdown table
│
├── lib/
│   ├── exportPdf.js      # jsPDF: per-candidate report + exam summary
│   ├── gazeTracker.js    # 5s circular gaze buffer (200ms sampling)
│   ├── mockData.js       # 12 pre-built candidate profiles
│   └── xai.js            # Weighted rule scoring engine (0–100)
│
├── pages/
│   ├── Dashboard.jsx     # Live invigilator view
│   ├── ExamClient.jsx    # Full student exam with webcam + recording
│   ├── ExamSetup.jsx     # Examiner question builder
│   └── Landing.jsx       # Public landing page
│
└── store/
    ├── dashboardStore.js # Zustand: 12 candidates, live simulation, actions
    └── examStore.js      # Zustand: exam config with localStorage persistence
```

---

## Key Libraries

| Package | Purpose |
|---------|---------|
| `react` `react-dom` | UI framework |
| `react-router-dom` | Client-side routing |
| `zustand` | Lightweight state management |
| `jspdf` + `jspdf-autotable` | PDF report export |
| `lucide-react` | Icon set |
| `tailwindcss` + `@tailwindcss/vite` | Utility-first CSS |

---

## Notable Implementation Details

### Gaze Tracker (`lib/gazeTracker.js`)
- Samples gaze direction every **200ms** into a circular buffer (last 25 readings = 5 seconds)
- `onUserInteraction()` — spikes gaze variance for 2s when student clicks/types
- `getGazeWindow()` — returns `{ centerPct, leftPct, rightPct, suspicious }` for the current 5s window
- `suspicious = true` when >30% of the window was non-center gaze

### ExamClient — Gaze Capture Flow
1. Student selects an answer → `onUserInteraction()` + immediate gaze stamp
2. Student clicks Next / Submit → `getGazeWindow()` captures 5s window → logged per question
3. On submit: `MediaRecorder` stops → Blob → `.webm` download link displayed

### Webcam Question Overlay
- `<canvas>` layered on top of `<video>` via `position: absolute`
- `requestAnimationFrame` loop draws `Q{N}` label in the **bottom-right corner** (12px margin, dark background)
- Avoids face/eye area entirely

### ExamStore — Persistence
- Config saved to `localStorage` key `proctorai_exam_config`
- ExamClient reads from store on mount via `loadConfig()`
- Falls back to 3 default algorithm MCQs if no examiner config found

### XAI Engine (`lib/xai.js`)
Deterministic, explainable scoring — no black-box ML:

```
tab_switch   → max 35 pts  (amber ≥1, red ≥3)
gaze_away    → max 30 pts  (amber ≥3, red ≥10)
face_absent  → max 20 pts  (amber ≥1, red ≥3)
paste        → max 10 pts  (amber ≥1, red ≥2)
keystroke    → max  5 pts  (amber ≥5, red ≥15)
```

Severity: CLEAN (0) · LOW (1–19) · AMBER (20–44) · HIGH (45–69) · RED (70+)

---

## Design Tokens (`index.css`)

```css
--color-navy:       #0D2B4E   /* primary brand */
--color-navy-light: #1A3A5C
--color-surface:    #F7F9FC   /* page background */
--color-accent:     #C41E3A   /* CTAs */
--font-sans:        Inter
--font-display:     Playfair Display
```

---

## Backend Proxy

The Vite dev server proxies these paths to `http://localhost:8000`:

```
/api  → http://localhost:8000/api
/ws   → ws://localhost:8000/ws
```

See `vite.config.js` for proxy config. The frontend runs fully standalone without the backend.

---

*ProctorAI — Agentic Autonomous Exam Integrity System*
