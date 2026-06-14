"""
Database layer for ProctorAI.

Activation:
  Set environment variable PROCTORAI_USE_DB=true to activate persistence.
  Set PROCTORAI_DB_PATH to customize the SQLite file location.

  When USE_DATABASE is False (default), all methods are no-ops that return
  safe fallback values — the rest of the app works identically without a DB.
"""

import json
import os
import sqlite3
from datetime import datetime

# ── Configuration ──────────────────────────────────────────────────────────────
USE_DATABASE: bool = os.getenv("PROCTORAI_USE_DB", "false").lower() == "true"
DB_PATH: str = os.getenv("PROCTORAI_DB_PATH", "proctorai.db")


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")  # better concurrency
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    """Create tables if they do not exist. Call once at startup."""
    if not USE_DATABASE:
        return
    with _connect() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS exam_configs (
                exam_id      TEXT PRIMARY KEY,
                config_json  TEXT NOT NULL,
                created_at   TEXT NOT NULL,
                updated_at   TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS consents (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                exam_id          TEXT    NOT NULL,
                candidate_id     TEXT,
                agreed_at        TEXT    NOT NULL,
                user_agent       TEXT,
                language         TEXT,
                timezone         TEXT,
                screen_res       TEXT,
                consent_version  TEXT    NOT NULL DEFAULT '1.0',
                raw_json         TEXT    NOT NULL
            );

            CREATE TABLE IF NOT EXISTS events (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                exam_id       TEXT    NOT NULL,
                candidate_id  TEXT    NOT NULL,
                event_type    TEXT    NOT NULL,
                ts            INTEGER NOT NULL,
                data_json     TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_events_exam
                ON events (exam_id, candidate_id, ts);

            CREATE INDEX IF NOT EXISTS idx_consents_exam
                ON consents (exam_id, candidate_id);
        """)


# ── Exam Config ────────────────────────────────────────────────────────────────

def save_exam_config(exam_id: str, config: dict) -> bool:
    """Upsert exam configuration. Returns True on success."""
    if not USE_DATABASE:
        return False
    now = datetime.utcnow().isoformat()
    try:
        with _connect() as conn:
            conn.execute(
                """
                INSERT INTO exam_configs (exam_id, config_json, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(exam_id) DO UPDATE
                    SET config_json = excluded.config_json,
                        updated_at  = excluded.updated_at
                """,
                (exam_id, json.dumps(config), now, now),
            )
        return True
    except Exception:
        return False


def load_exam_config(exam_id: str) -> dict | None:
    """Load exam configuration by ID. Returns None if not found or DB disabled."""
    if not USE_DATABASE:
        return None
    try:
        with _connect() as conn:
            row = conn.execute(
                "SELECT config_json FROM exam_configs WHERE exam_id = ?",
                (exam_id,),
            ).fetchone()
            if row:
                return json.loads(row["config_json"])
    except Exception:
        pass
    return None


# ── Consent Audit Trail ────────────────────────────────────────────────────────

def save_consent(record: dict) -> bool:
    """Persist a consent record. Returns True on success."""
    if not USE_DATABASE:
        return False
    try:
        with _connect() as conn:
            conn.execute(
                """
                INSERT INTO consents
                    (exam_id, candidate_id, agreed_at, user_agent,
                     language, timezone, screen_res, consent_version, raw_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.get("examId"),
                    record.get("candidateId"),
                    record.get("agreedAt"),
                    record.get("userAgent"),
                    record.get("language"),
                    record.get("timezone"),
                    record.get("screenRes"),
                    record.get("consentVersion", "1.0"),
                    json.dumps(record),
                ),
            )
        return True
    except Exception:
        return False


def get_consents(exam_id: str, candidate_id: str | None = None) -> list[dict]:
    """Retrieve consent records for an exam (optionally filtered by candidate)."""
    if not USE_DATABASE:
        return []
    try:
        with _connect() as conn:
            if candidate_id:
                rows = conn.execute(
                    "SELECT raw_json FROM consents WHERE exam_id = ? AND candidate_id = ?",
                    (exam_id, candidate_id),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT raw_json FROM consents WHERE exam_id = ?",
                    (exam_id,),
                ).fetchall()
            return [json.loads(r["raw_json"]) for r in rows]
    except Exception:
        return []


# ── Events ────────────────────────────────────────────────────────────────────

def save_events(exam_id: str, candidate_id: str, events: list[dict]) -> bool:
    """Batch-insert raw monitoring events."""
    if not USE_DATABASE or not events:
        return False
    try:
        with _connect() as conn:
            conn.executemany(
                """
                INSERT INTO events (exam_id, candidate_id, event_type, ts, data_json)
                VALUES (?, ?, ?, ?, ?)
                """,
                [
                    (exam_id, candidate_id, e["type"], e["ts"], json.dumps(e.get("data", {})))
                    for e in events
                ],
            )
        return True
    except Exception:
        return False


def get_events(exam_id: str, candidate_id: str) -> list[dict]:
    """Retrieve all stored events for a candidate."""
    if not USE_DATABASE:
        return []
    try:
        with _connect() as conn:
            rows = conn.execute(
                """
                SELECT event_type, ts, data_json
                FROM events
                WHERE exam_id = ? AND candidate_id = ?
                ORDER BY ts ASC
                """,
                (exam_id, candidate_id),
            ).fetchall()
            return [
                {"type": r["event_type"], "ts": r["ts"], "data": json.loads(r["data_json"])}
                for r in rows
            ]
    except Exception:
        return []
