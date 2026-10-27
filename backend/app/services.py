"""Actions shared by the REST routes and the voice agent's tools.

Both front doors call the same functions, so a hazard reported by voice gets
exactly the same checks and deadlines as one typed into the app.
"""

import math
from datetime import datetime

from fastapi import HTTPException, status

from . import feedback, payroll, safety, wellbeing
from .crypto import reporter_tag, sealer, voter_tag
from .store import IST, Feedback, Hazard, Shift, User, db, iso_week


def now() -> datetime:
    return datetime.now(IST)


def _metres(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = (math.sin((p2 - p1) / 2) ** 2
         + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lng2 - lng1) / 2) ** 2)
    return 2 * 6_371_000 * math.asin(math.sqrt(a))


def check_in(worker: User, code: str, lat: float | None, lng: float | None) -> Shift:
    site = db.sites[worker.site_id]
    if code.strip().upper() != site.code:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "This QR code is not for your site.")
    # Location is optional, as many basic phones have no GPS fix indoors; the QR
    # poster on site is the main proof. When a fix is sent, it must be on site.
    if lat is not None and lng is not None:
        away = _metres(lat, lng, site.lat, site.lng)
        if away > site.radius_m:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"You are {away:.0f} m from the site.")
    if db.open_shift(worker.id):
        raise HTTPException(status.HTTP_409_CONFLICT, "You are already checked in.")
    shift = Shift(db.new_id("sh"), worker.id, site.id, now())
    db.shifts[shift.id] = shift
    return shift


def check_out(worker: User) -> Shift:
    shift = db.open_shift(worker.id)
    if not shift:
        raise HTTPException(status.HTTP_409_CONFLICT, "You are not checked in.")
    shift.end = now()
    return shift


def payslip_for(worker: User, year: int, month: int) -> dict:
    return payroll.payslip(db.shifts_of(worker.id), worker.hourly_rate, year, month)


def fatigue_for(worker: User) -> dict:
    return wellbeing.fatigue(db.shifts_of(worker.id), now())


def report_hazard(worker: User, category: str, severity: str, description: str,
                  location: str, anonymous: bool, channel: str = "app") -> Hazard:
    h = Hazard(db.new_id("h"), worker.site_id, None if anonymous else worker.id,
               category, severity, description.strip(), location.strip(), now(), channel=channel,
               reporter_tag=reporter_tag(worker.id))
    db.hazards[h.id] = h
    return h


def reports_by(worker: User) -> list[Hazard]:
    """A worker's own reports, newest first, including the ones sent without their name."""
    tag = reporter_tag(worker.id)
    return sorted((h for h in db.hazards.values() if h.reporter_tag == tag), key=lambda h: h.created, reverse=True)


def submit_feedback(worker: User, topic: str, rating: int, comment: str | None) -> None:
    text = (comment or "").strip()
    fid = db.new_id("f")
    db.feedback[fid] = Feedback(fid, worker.site_id, topic, rating,
                                sealer.seal(text, worker.site_id) if text else None, iso_week(now().date()))
    db.feedback_voters.setdefault(worker.site_id, set()).add(voter_tag(worker.id))


def hazard_view(h: Hazard) -> dict:
    site = db.sites[h.site_id]
    reporter = db.users.get(h.reporter_id) if h.reporter_id else None
    return {
        "id": h.id, "site": site.name, "site_id": site.id, "category": h.category, "severity": h.severity,
        "description": h.description, "location": h.location, "status": h.status, "channel": h.channel,
        "created": h.created.isoformat(), "reporter": reporter.name if reporter else "Anonymous",
        **safety.escalation(h, now()),
    }


def site_feedback(site_id: str) -> dict:
    people = len(db.feedback_voters.get(site_id, ()))
    return feedback.summarize(list(db.feedback.values()), site_id, sealer, people)


def worker_status(w: User) -> dict:
    t = now()
    shifts = db.shifts_of(w.id)
    tired = wellbeing.fatigue(shifts, t)
    # Named reports only: counting anonymous ones would tell a manager who sent them.
    ignored = sum(1 for h in db.hazards.values() if h.reporter_id == w.id and safety.escalation(h, t)["overdue"])
    rating = site_feedback(w.site_id).get("average")
    shift = db.open_shift(w.id)
    return {
        "id": w.id, "name": w.name, "trade": w.trade, "site_id": w.site_id, "lang": w.lang,
        "checked_in": shift is not None,
        "on_site_since": shift.start.isoformat() if shift else None,
        "fatigue": tired,
        "quit_risk": wellbeing.quit_risk(shifts, w.joined, tired["level"], ignored, rating, t),
    }
