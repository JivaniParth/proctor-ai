"""FastAPI WebSocket endpoint for ProctorAI exam clients."""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError

from aggregator import Aggregator, RawEvent as AggEvent
from xai import evaluate

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="ProctorAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_TYPES = {
    "gaze_away", "face_absent", "face_present",
    "tab_switch", "keystroke", "paste", "snapshot",
}


class RawEvent(BaseModel):
    type: str
    ts: int
    data: dict = {}

    def validate_type(self) -> bool:
        return self.type in VALID_TYPES


class IncomingBatch(BaseModel):
    events: list[RawEvent]


@dataclass
class CandidateSession:
    exam_id: str
    candidate_id: str
    socket: Optional[WebSocket] = None
    connected_at: datetime = field(default_factory=datetime.utcnow)
    reconnects: int = 0
    event_log: list[dict] = field(default_factory=list)
    aggregator: Aggregator = field(default_factory=Aggregator)
    last_eval: Optional[dict] = None

    def append_events(self, events: list[RawEvent]):
        for e in events:
            self.event_log.append({
                "exam_id": self.exam_id,
                "candidate_id": self.candidate_id,
                "type": e.type,
                "ts": e.ts,
                "data": e.data,
            })

    def on_reconnect(self, socket: WebSocket):
        self.socket = socket
        self.reconnects += 1

    def on_disconnect(self):
        self.socket = None


class SessionManager:
    def __init__(self):
        self._sessions: dict[tuple, CandidateSession] = {}
        self._lock = asyncio.Lock()
        self._dashboard_clients: list[WebSocket] = []

    async def get_or_create(self, exam_id: str, candidate_id: str, socket: WebSocket) -> CandidateSession:
        async with self._lock:
            key = (exam_id, candidate_id)
            if key in self._sessions:
                session = self._sessions[key]
                session.on_reconnect(socket)
            else:
                session = CandidateSession(exam_id=exam_id, candidate_id=candidate_id, socket=socket)
                self._sessions[key] = session
            return session

    async def remove(self, exam_id: str, candidate_id: str):
        async with self._lock:
            key = (exam_id, candidate_id)
            if key in self._sessions:
                self._sessions[key].on_disconnect()

    def get(self, exam_id: str, candidate_id: str) -> Optional[CandidateSession]:
        return self._sessions.get((exam_id, candidate_id))

    def all_sessions(self, exam_id: str) -> list[CandidateSession]:
        return [s for (eid, _), s in self._sessions.items() if eid == exam_id]

    async def register_dashboard(self, ws: WebSocket):
        self._dashboard_clients.append(ws)

    async def unregister_dashboard(self, ws: WebSocket):
        if ws in self._dashboard_clients:
            self._dashboard_clients.remove(ws)

    async def broadcast_eval(self, exam_id: str, candidate_id: str, eval_data: dict):
        dead = []
        for ws in self._dashboard_clients:
            try:
                await ws.send_json({"exam_id": exam_id, "candidate_id": candidate_id, **eval_data})
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.unregister_dashboard(ws)


session_manager = SessionManager()


async def run_pipeline(session: CandidateSession, new_events: list[RawEvent]):
    agg_events = [AggEvent(type=e.type, ts=e.ts, data=e.data) for e in new_events if e.type != "snapshot"]
    window = session.aggregator.update(agg_events)
    result = evaluate(window)
    eval_data = {
        "score": result.score,
        "severity": result.severity,
        "reason": result.reason,
        "breakdown": [
            {"signal": h.signal, "label": h.label, "count": h.count,
             "severity": h.severity, "score_contribution": h.score_contribution}
            for h in result.breakdown
        ],
    }
    session.last_eval = eval_data
    await session_manager.broadcast_eval(session.exam_id, session.candidate_id, eval_data)


@app.get("/")
async def root():
    return {"service": "ProctorAI", "status": "running", "version": "1.0.0"}


@app.get("/admin/sessions/{exam_id}")
async def list_sessions(exam_id: str):
    sessions = session_manager.all_sessions(exam_id)
    return {
        "exam_id": exam_id,
        "candidates": [
            {
                "candidate_id": s.candidate_id,
                "connected": s.socket is not None,
                "reconnects": s.reconnects,
                "event_count": len(s.event_log),
                "connected_at": s.connected_at.isoformat(),
                "last_eval": s.last_eval,
            }
            for s in sessions
        ],
    }


@app.websocket("/ws/dashboard/{exam_id}")
async def dashboard_ws(websocket: WebSocket, exam_id: str):
    await websocket.accept()
    await session_manager.register_dashboard(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await session_manager.unregister_dashboard(websocket)


@app.websocket("/ws/{exam_id}/{candidate_id}")
async def ws_endpoint(websocket: WebSocket, exam_id: str, candidate_id: str):
    await websocket.accept()
    session = await session_manager.get_or_create(exam_id, candidate_id, websocket)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                continue

            try:
                batch = IncomingBatch(**payload)
            except ValidationError:
                continue

            valid_events = [e for e in batch.events if e.validate_type()]
            if not valid_events:
                continue

            session.append_events(valid_events)
            asyncio.create_task(run_pipeline(session, valid_events))

    except WebSocketDisconnect:
        await session_manager.remove(exam_id, candidate_id)
