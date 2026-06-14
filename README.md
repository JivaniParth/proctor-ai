# ProctorAI

**Agentic Autonomous Exam Integrity System** — FAR AWAY Hackathon 2026  
Theme: *Agentic & Autonomous Systems*

ProctorAI continuously observes candidate behavior, reasons over events, generates explainable decisions, and assists human proctors through an autonomous reasoning engine.

## Features

- **Invigilator Dashboard** — Candidate grid, live risk scores, XAI reasoning panel, flag timeline, snapshot review, action buttons, PDF export
- **Exam Client** — Webcam monitoring, gaze tracking simulation, tab/clipboard detection, real-time event buffer
- **XAI Engine** — Deterministic, explainable risk scoring (0–100) with human-readable reasons
- **Backend** — FastAPI + WebSockets with rolling 5-minute window aggregation

## Quick Start

### Frontend

```bash
cd proctorai/frontend
npm install
npm run dev
```

Open http://localhost:5173

### Backend (optional)

```bash
cd proctorai/backend
pip install -r requirements.txt
uvicorn router:app --host 0.0.0.0 --port 8000 --reload
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with problem, solution, architecture |
| `/dashboard` | Live invigilator dashboard with XAI panel |
| `/exam` | Candidate exam client with monitoring |

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Zustand, jsPDF
- **Backend:** Python, FastAPI, WebSockets
- **AI/CV:** MediaPipe FaceMesh (reference), rule-based XAI engine

## Design

Colors from ProctorAI Light Mode deck:
- Navy `#0D2B4E`
- Surface `#F7F9FC`
- Accent `#C41E3A`
