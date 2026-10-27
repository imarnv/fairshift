"""Hazard deadlines and automatic escalation.

Each severity has a deadline. A report still unresolved past it climbs one level
up the chain, and another after twice the deadline, so a report can't sit
ignored with the supervisor until someone gets hurt. Escalation is worked out
whenever a report is read, so no scheduler is needed.
"""

from datetime import datetime, timedelta

from .store import Hazard

DEADLINE_H = {"critical": 4, "high": 24, "medium": 72, "low": 168}
CHAIN = ["Site supervisor", "Site manager", "HR & Safety head"]


def escalation(h: Hazard, now: datetime) -> dict:
    deadline = timedelta(hours=DEADLINE_H[h.severity])
    due = h.created + deadline
    closed_at = h.resolved_at if h.status == "resolved" else None
    late_by = (closed_at or now) - due
    level = 0 if late_by <= timedelta(0) else 1 if late_by <= deadline else 2
    return {
        "due": due.isoformat(),
        "overdue": closed_at is None and late_by > timedelta(0),
        "met_deadline": closed_at is not None and closed_at <= due,
        "level": level if closed_at is None else 0,
        "assigned_to": CHAIN[level if closed_at is None else 0],
    }
