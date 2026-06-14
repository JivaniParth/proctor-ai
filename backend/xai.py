"""Rule-based XAI scorer + explanation builder."""

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class SignalRule:
    signal: str
    label: str
    label_plural: str
    amber: int
    red: int
    weight: int


RULES: list[SignalRule] = [
    SignalRule("tab_switch", "tab switch", "tab switches", amber=1, red=3, weight=35),
    SignalRule("gaze_away", "gaze-away", "gaze-aways", amber=3, red=10, weight=30),
    SignalRule("face_absent", "face absent", "face absences", amber=1, red=3, weight=20),
    SignalRule("paste", "paste", "pastes", amber=1, red=2, weight=10),
    SignalRule("keystroke", "odd keystroke", "odd keystrokes", amber=5, red=15, weight=5),
]

_RULE_MAP: dict[str, SignalRule] = {r.signal: r for r in RULES}

assert sum(r.weight for r in RULES) == 100


@dataclass
class RuleHit:
    signal: str
    label: str
    count: int
    severity: str
    score_contribution: int


@dataclass
class EvalResult:
    score: int
    severity: str
    reason: str
    breakdown: list[RuleHit]
    window_minutes: int


def _severity_band(score: int) -> str:
    if score == 0:
        return "CLEAN"
    if score < 20:
        return "LOW"
    if score < 45:
        return "AMBER"
    if score < 70:
        return "HIGH"
    return "RED"


def _rule_score(rule: SignalRule, count: int) -> tuple[int, Optional[str]]:
    if count < rule.amber:
        return 0, None
    if count >= rule.red:
        return rule.weight, "RED"
    ratio = (count - rule.amber) / max(rule.red - rule.amber, 1)
    points = round(rule.weight * ratio)
    return points, "AMBER"


def _build_reason(hits: list[RuleHit], window_minutes: int) -> str:
    if not hits:
        return "No suspicious activity detected"
    sorted_hits = sorted(hits, key=lambda h: h.score_contribution, reverse=True)
    clauses = []
    for hit in sorted_hits:
        label = hit.label if hit.count == 1 else hit.label + "s" if not hit.label.endswith("s") else hit.label
        clauses.append(f"{hit.count} {label}")
    return f"{' · '.join(clauses)} in {window_minutes} min"


def evaluate(window) -> EvalResult:
    total_score = 0
    hits: list[RuleHit] = []

    for rule in RULES:
        count = getattr(window, rule.signal, 0)
        points, severity = _rule_score(rule, count)
        if severity is not None:
            hits.append(RuleHit(
                signal=rule.signal,
                label=rule.label_plural if count > 1 else rule.label,
                count=count,
                severity=severity,
                score_contribution=points,
            ))
            total_score += points

    total_score = min(total_score, 100)
    return EvalResult(
        score=total_score,
        severity=_severity_band(total_score),
        reason=_build_reason(hits, 5),
        breakdown=hits,
        window_minutes=5,
    )
