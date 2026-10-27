"""Fatigue alerts, quit risk and the per-site Fair Workplace Index.

Every score is a short list of plain rules, and each one returns the reasons that
fired. A manager can see why a worker is flagged and act on that cause, and a
worker is never judged by a model nobody can explain.
"""

from datetime import date, datetime, timedelta

from .payroll import shift_hours
from .store import Shift

MIN_REST_H = 11          # rest between shifts (ILO and EU working-time norm)
LONG_SHIFT_H = 12
WEEK_LIMIT_H = 48        # Factories Act s.51
WEEK_HARD_LIMIT_H = 60   # s.64 caps hours including overtime
MAX_DAYS_WITHOUT_REST = 7  # s.52 guarantees a weekly holiday

_RANK = {"ok": 0, "medium": 1, "high": 2}


def _worse(a: str, b: str) -> str:
    return a if _RANK[a] >= _RANK[b] else b


def _longest_run(days: set[date]) -> int:
    best = run = 0
    prev = None
    for d in sorted(days):
        run = run + 1 if prev and d - prev == timedelta(days=1) else 1
        best, prev = max(best, run), d
    return best


def fatigue(shifts: list[Shift], now: datetime) -> dict:
    """Looks at the last 7 days of completed shifts, sorted by start."""
    week = [s for s in shifts if s.end and s.start >= now - timedelta(days=7)]
    hours = sum(shift_hours(s) for s in week)
    reasons, level = [], "ok"

    if hours > WEEK_HARD_LIMIT_H:
        reasons.append({"code": "week_over_60", "value": round(hours, 1)})
        level = "high"
    elif hours > WEEK_LIMIT_H:
        reasons.append({"code": "week_over_48", "value": round(hours, 1)})
        level = "medium"

    long_shifts = sum(shift_hours(s) > LONG_SHIFT_H for s in week)
    if long_shifts:
        reasons.append({"code": "long_shifts", "value": long_shifts})
        level = _worse(level, "medium")

    short_rests = sum((b.start - a.end).total_seconds() / 3600 < MIN_REST_H for a, b in zip(week, week[1:]))
    if short_rests:
        reasons.append({"code": "short_rest", "value": short_rests})
        level = _worse(level, "high" if short_rests >= 3 else "medium")

    run = _longest_run({s.start.date() for s in shifts if s.end and s.start >= now - timedelta(days=14)})
    if run >= MAX_DAYS_WITHOUT_REST:
        reasons.append({"code": "no_rest_day", "value": run})
        level = "high"

    return {"level": level, "week_hours": round(hours, 1), "reasons": reasons}


def quit_risk(shifts: list[Shift], joined: date, fatigue_level: str, overdue_reports: int,
              site_rating: float | None, now: datetime) -> dict:
    """0-100. Each rule adds points; `reasons` lists what added them."""
    def hours_between(a: int, b: int) -> float:
        lo, hi = now - timedelta(days=a), now - timedelta(days=b)
        return sum(shift_hours(s) for s in shifts if lo <= s.start < hi)

    reasons = []
    if fatigue_level != "ok":
        reasons.append({"code": f"fatigue_{fatigue_level}", "points": 30 if fatigue_level == "high" else 15})
    recent, before = hours_between(14, 0), hours_between(28, 14)
    if before and recent < before * 0.7:
        reasons.append({"code": "attendance_drop", "points": 25, "value": round(100 * (1 - recent / before))})
    if (now.date() - joined).days < 90:
        reasons.append({"code": "new_joiner", "points": 10})
    if overdue_reports:
        reasons.append({"code": "reports_ignored", "points": 15, "value": overdue_reports})
    if site_rating is not None and site_rating < 3:
        reasons.append({"code": "low_site_rating", "points": 10, "value": site_rating})

    score = min(100, sum(r["points"] for r in reasons))
    return {"score": score, "level": "high" if score >= 50 else "medium" if score >= 25 else "low",
            "reasons": reasons}


def fairness_index(on_time_rate: float | None, rested_rate: float, rating: float | None) -> int:
    """0-100 from the parts a site has data for: hazards fixed within their
    deadline, workers not flagged for fatigue, and anonymous ratings."""
    parts = [p for p in (on_time_rate, rested_rate, rating / 5 if rating is not None else None) if p is not None]
    return round(100 * sum(parts) / len(parts))
