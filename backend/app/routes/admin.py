"""The employer dashboard. Every route here needs a manager account."""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status

from .. import services, wellbeing
from ..schemas import CredentialIn, HazardUpdate
from ..security import require
from ..store import db

router = APIRouter(prefix="/api/admin", dependencies=[Depends(require("manager"))])


def _site_card(site_id: str, statuses: list[dict]) -> dict:
    site = db.sites[site_id]
    t = services.now()
    recent = [h for h in db.hazards.values() if h.site_id == site_id and h.created >= t - timedelta(days=30)]
    views = [services.hazard_view(h) for h in recent]
    closed = [v for v in views if v["status"] == "resolved"]
    on_time = sum(v["met_deadline"] for v in closed) / len(closed) if closed else None
    people = [s for s in statuses if s["site_id"] == site_id]
    rested = sum(s["fatigue"]["level"] == "ok" for s in people) / len(people) if people else 1.0
    fb = services.site_feedback(site_id)
    return {
        "id": site.id, "name": site.name, "sector": site.sector, "city": site.city, "code": site.code,
        "workers": len(people),
        "on_site": sum(s["checked_in"] for s in people),
        "open_hazards": sum(v["status"] != "resolved" for v in views),
        "overdue_hazards": sum(v["overdue"] for v in views),
        "rating": fb.get("average"),
        "fairness_index": wellbeing.fairness_index(on_time, rested, fb.get("average")),
    }


def _daily_hours(t, days: int) -> list[dict]:
    """Hours worked across all sites on each of the last `days` days, oldest first."""
    totals = {(t - timedelta(days=n)).date(): 0.0 for n in range(days - 1, -1, -1)}
    for s in db.shifts.values():
        if s.end and s.start.date() in totals:
            totals[s.start.date()] += (s.end - s.start).total_seconds() / 3600
    return [{"date": d.isoformat(), "hours": round(h)} for d, h in totals.items()]


@router.get("/overview")
def overview() -> dict:
    statuses = [services.worker_status(w) for w in db.workers()]
    sites = sorted((_site_card(sid, statuses) for sid in db.sites), key=lambda s: -s["fairness_index"])
    t = services.now()
    week = [s for s in db.shifts.values() if s.end and s.start >= t - timedelta(days=7)]
    return {
        "workers": len(statuses),
        "on_site": sum(s["checked_in"] for s in statuses),
        "fatigue_high": sum(s["fatigue"]["level"] == "high" for s in statuses),
        "quit_risk_high": sum(s["quit_risk"]["level"] == "high" for s in statuses),
        "open_hazards": sum(h.status != "resolved" for h in db.hazards.values()),
        "overdue_hazards": sum(services.hazard_view(h)["overdue"] for h in db.hazards.values()),
        "week_hours": round(sum((s.end - s.start).total_seconds() for s in week) / 3600),
        "daily_hours": _daily_hours(t, 14),
        "sites": sites,
    }


@router.get("/workers")
def workers() -> list[dict]:
    rows = [services.worker_status(w) for w in db.workers()]
    return sorted(rows, key=lambda r: -r["quit_risk"]["score"])


@router.get("/hazards")
def hazards() -> list[dict]:
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    views = [services.hazard_view(h) for h in db.hazards.values()]
    return sorted(views, key=lambda v: (v["status"] == "resolved", not v["overdue"], order[v["severity"]]))


@router.patch("/hazards/{hazard_id}")
def update_hazard(hazard_id: str, body: HazardUpdate) -> dict:
    h = db.hazards.get(hazard_id)
    if not h:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such report.")
    h.status = body.status
    h.resolved_at = services.now() if body.status == "resolved" else None
    return services.hazard_view(h)


@router.get("/feedback")
def feedback() -> list[dict]:
    return [services.site_feedback(sid) | {"site": db.sites[sid].name} for sid in db.sites]


@router.post("/workers/{worker_id}/credentials", status_code=201)
def endorse(worker_id: str, body: CredentialIn) -> dict:
    worker = db.users.get(worker_id)
    if not worker or worker.role != "worker":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such worker.")
    cred = db.issue_credential(worker, body.skill.strip(), db.sites[worker.site_id].name, services.now().date())
    return {"id": cred.id, "token": cred.token}
