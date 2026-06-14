"""Rolling 5-minute event window aggregator."""

from dataclasses import dataclass, field
from time import time


@dataclass
class RawEvent:
    type: str
    ts: int
    data: dict = field(default_factory=dict)


@dataclass
class WindowResult:
    tab_switch: int = 0
    gaze_away: int = 0
    face_absent: int = 0
    paste: int = 0
    keystroke: int = 0
    window_start: int = 0
    window_end: int = 0


WINDOW_MS = 5 * 60 * 1000


class Aggregator:
    def __init__(self):
        self._events: list[RawEvent] = []

    def update(self, new_events: list[RawEvent]) -> WindowResult:
        self._events.extend(new_events)
        now = int(time() * 1000)
        cutoff = now - WINDOW_MS
        self._events = [e for e in self._events if e.ts >= cutoff]

        counts = WindowResult(window_start=cutoff, window_end=now)
        for e in self._events:
            if hasattr(counts, e.type):
                setattr(counts, e.type, getattr(counts, e.type) + 1)
        return counts
