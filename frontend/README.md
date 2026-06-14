# ProctorAI — Frontend

React 19 + Vite 8 frontend for the ProctorAI Agentic Exam Integrity System.  
Built with **React JSX** (no TypeScript), **Tailwind CSS v4**, **Zustand**, and native browser APIs.

---

## Getting Started

```bash
npm install
npm run dev      # development server → http://localhost:5173
npm run build    # production bundle → dist/
npm run preview  # preview production build
```

---

## Routes

| Route | Component | Role |
|-------|-----------|------|
| `/` | `Landing.jsx` | Public — marketing & product overview |
| `/setup` | `ExamSetup.jsx` | Examiner — configure questions and exam settings |
| `/exam` | `ExamClient.jsx` | Student — live monitored exam session |
| `/dashboard` | `Dashboard.jsx` | Invigilator — live candidate monitoring |
| `/privacy` | `PrivacyPolicy.jsx` | Public — full legal privacy policy |

---

## Source Structure

```
src/
├── App.jsx               # BrowserRouter + 5 routes
├── main.jsx              # React root mount
├── index.css             # Tailwind + design tokens + animations
│
├── components/
│   ├── ActionBar.jsx     # Dashboard: Warn / Flag / Dismiss / Export / Terminate
│   ├── CandidateCard.jsx # Dashboard grid card with risk bar + severity badge
│   ├── FlagTimeline.jsx  # Chronological event timeline with icons
│   ├── Navbar.jsx        # Sticky nav: Home, Dashboard, Exam, Setup, Privacy
│   ├── RiskMeter.jsx     # SVG circular gauge (0–100, color-coded)
│   ├── SeverityBadge.jsx # Pill: CLEAN / LOW / AMBER / HIGH / RED
│   ├── SnapshotReview.jsx# 2×2 webcam snapshot grid
│   └── XAIPanel.jsx      # Reasoning text + signal breakdown table
│
├── lib/
│   ├── audioMonitor.js   # Speech detection via Web Audio API AnalyserNode
│   ├── exportPdf.js      # jsPDF per-candidate report + exam summary
│   ├── gazeTracker.js    # 5s circular gaze buffer (200ms sampling)
│   ├── mockData.js       # 12 pre-built candidate profiles for dashboard
│   ├── wsClient.js       # Offline-first WS client + apiGet/apiPost helpers
│   └── xai.js            # Weighted rule scoring engine (0–100)
│
├── pages/
│   ├── Dashboard.jsx     # Invigilator live view — grid + detail panel
│   ├── ExamClient.jsx    # Full student exam with all monitoring features
│   ├── ExamSetup.jsx     # Examiner question builder with validation
│   ├── Landing.jsx       # Public landing page
│   └── PrivacyPolicy.jsx # Legal policy with ToC + section anchors
│
└── store/
    ├── dashboardStore.js # Zustand: 12 candidates, live simulation, actions
    └── examStore.js      # Zustand: config with backend-first load + localStorage fallback
```

---

## Key Libraries

| Package | Purpose |
|---------|---------|
| `react` `react-dom` | UI framework |
| `react-router-dom` | Client-side routing (5 routes) |
| `zustand` | Lightweight state management |
| `jspdf` + `jspdf-autotable` | PDF integrity report export |
| `lucide-react` | Icon set |
| `tailwindcss` + `@tailwindcss/vite` | Utility-first CSS |

---

## Feature Deep Dives

### `lib/wsClient.js` — Offline-First WebSocket

Connects directly to `ws://localhost:8000/ws/{examId}/{candidateId}` — no Vite proxy dependency.

```
Strategy:
1. Try to connect immediately on exam start
2. If backend unreachable → buffer events in localStorage (max 1,000)
3. On reconnect → flush buffer in 50-event chunks → clear localStorage
4. Exponential backoff: 1s → 2s → 4s … max 30s
```

Also exports `apiGet(path)` and `apiPost(path, body)` — both return `{ ok, data?, offline? }` and never throw.

---

### `lib/audioMonitor.js` — Speech Detection

Uses `Web Audio API` `AnalyserNode` to measure microphone volume.

```
- Polls RMS amplitude every 250ms
- Speech triggered when RMS > 22 (threshold) for ≥ 1,500ms continuously
- 5s cooldown prevents repeated events from sustained speech
- Does NOT transcribe or store speech content — only fires a callback
```

`startAudioMonitor(stream, onSpeechDetected)` → `stopAudioMonitor()`

---

### `lib/gazeTracker.js` — Gaze Buffer

Samples gaze direction every **200ms** into a circular buffer (last 25 readings = 5 seconds).

- `onUserInteraction()` — spikes gaze variance for 2s (simulates natural gaze shift on interaction)
- `getGazeWindow()` → `{ centerPct, leftPct, rightPct, sampleCount, suspicious }`
- `suspicious = true` when >30% of the window was non-center

---

### `ExamClient.jsx` — Complete Monitoring Flow

**Exam start sequence:**
1. Verify consent checkbox is checked
2. Record consent audit trail → `localStorage` + `POST /api/consent`
3. `getUserMedia({ video: true, audio: true })` — if DENIED → blocking error screen, exam stops
4. Attach stream to `<video>` element
5. Start `MediaRecorder` with `audio: true` — combined `.webm` recording
6. `startAudioMonitor(stream, onSpeechDetected)` — speech detection active
7. Create `wsClient` → `connect()` — WebSocket to backend with auto-reconnect
8. `startGazeTracking()` — gaze sampling begins

**During exam — events sent via WebSocket (buffered if offline):**
- `tab_switch` — `document.visibilitychange`
- `paste` — `document.paste`
- `keystroke` — `document.keydown` (count only to backend; content tracked locally)
- `speech` — fired by `audioMonitor`
- `snapshot` — every 20 seconds
- `gaze_away` / `gaze_center` — on gaze direction changes

**Keystroke content capture:**
```js
// All printable characters; excludes Ctrl/Alt/Meta/function keys
if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
  setKeystrokeLog(prev => [...prev, { key: e.key, ts: Date.now(), qNum }])
}
```

**Red-flag snapshot:**
- Triggers when `tabSwitches >= 3` OR `pastes >= 2`
- `canvas.toDataURL('image/jpeg', 0.7)` captures webcam frame at the moment of escalation
- Stored in state; displayed on submit screen

**Canvas overlay (question number):**
- `requestAnimationFrame` loop draws `Q{N}` label **bottom-right corner** (12px margin)
- Dark semi-transparent background, white text
- Avoids face/eye region entirely

**Submit sequence:**
1. Capture final question's gaze window
2. `stopGazeTracking()` + `stopAudioMonitor()`
3. `MediaRecorder.stop()` → Blob → `URL.createObjectURL()` → download link
4. Stop all media tracks
5. `wsClient.disconnect()`

---

### `store/examStore.js` — Config Persistence

```
loadConfig():
  1. GET /api/exam-config/{examId} from backend
  2. If offline/404 → read localStorage
  3. If nothing → use 3 default algorithm MCQs

saveConfig(config):
  1. Write to localStorage immediately (no network needed)
  2. POST /api/exam-config to backend
  3. Report: 'saved-server' | 'saved-local'
```

`configSource` state: `'server'` | `'local'` | `'default'`

---

### `lib/xai.js` — Client-Side Scoring

Deterministic weighted scoring, identical algorithm to backend `xai.py`:

```
tab_switch   → max 35 pts  (amber ≥1, red ≥3)
gaze_away    → max 30 pts  (amber ≥3, red ≥10)
face_absent  → max 20 pts  (amber ≥1, red ≥3)
paste        → max 10 pts  (amber ≥1, red ≥2)
keystroke    → max  5 pts  (amber ≥5, red ≥15)
```

Score → Severity: `CLEAN (0)` · `LOW (1–19)` · `AMBER (20–44)` · `HIGH (45–69)` · `RED (70+)`

---

## System Status Panel (9 signals)

| Signal | What changes it |
|--------|----------------|
| Webcam | `getUserMedia` success |
| Microphone | Audio track in stream |
| Gaze Tracking | Live direction label |
| Face Detection | Face presence state |
| WebSocket | `'connected'` / `'syncing'` / `'disconnected'` |
| Tab Switches | `visibilitychange` count |
| Paste Events | `paste` event count |
| Keystrokes | `keydown` count |
| Speech Events | `audioMonitor` trigger count |

---

## Consent Audit Trail

Captured at exam start (after consent checkbox + "Begin Examination"):

```json
{
  "agreedAt": "2026-06-14T06:40:00.000Z",
  "examId": "EXAM-2026-001",
  "examName": "Advanced Algorithms — Final Examination",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "language": "en-US",
  "timezone": "Asia/Kolkata",
  "screenRes": "1920x1080",
  "consentVersion": "1.0"
}
```

Stored: `localStorage['proctorai_consent_{examId}']` + `POST /api/consent`

---

## Backend Connection

The frontend connects **directly** to `http://localhost:8000` — not via Vite proxy.

```
Frontend:  http://localhost:5173
Backend:   http://localhost:8000
WebSocket: ws://localhost:8000/ws/{examId}/{candidateId}
Dashboard: ws://localhost:8000/ws/dashboard/{examId}
```

**The frontend works fully without the backend.** Events are buffered in `localStorage` and auto-synced when the backend comes online.

---

## Design Tokens (`index.css`)

| Token | Value |
|-------|-------|
| `--color-navy` | `#0D2B4E` |
| `--color-navy-light` | `#1A3A5C` |
| `--color-surface` | `#F7F9FC` |
| `--color-accent` | `#C41E3A` |
| Font sans | Inter |
| Font display | Playfair Display |

---

*ProctorAI — Agentic Autonomous Exam Integrity System*
