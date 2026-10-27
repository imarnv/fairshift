"""The worker app: sign-in, shifts, pay, safety reports, feedback, skill passport."""

from datetime import date

from fastapi import APIRouter, Depends, Query

from .. import payments, services
from ..crypto import signer
from ..schemas import CheckInIn, FeedbackIn, HazardIn, LangIn, LoginIn, VerifyIn
from ..security import authenticate, current_user, issue_token, require
from ..store import User, db

router = APIRouter(prefix="/api")
worker_only = require("worker")


@router.post("/auth/login")
def login(body: LoginIn) -> dict:
    user = authenticate(body.phone, body.pin)
    return {"token": issue_token(user), "role": user.role}


@router.get("/me")
def me(user: User = Depends(current_user)) -> dict:
    site = db.sites.get(user.site_id) if user.site_id else None
    return {"id": user.id, "name": user.name, "role": user.role, "lang": user.lang, "trade": user.trade,
            "site": {"id": site.id, "name": site.name, "sector": site.sector} if site else None,
            "checked_in": db.open_shift(user.id) is not None}


@router.put("/me/lang")
def set_lang(body: LangIn, user: User = Depends(current_user)) -> dict:
    user.lang = body.lang
    return {"lang": user.lang}


@router.post("/shifts/check-in", status_code=201)
def check_in(body: CheckInIn, user: User = Depends(worker_only)) -> dict:
    return {"started": services.check_in(user, body.code, body.lat, body.lng).start.isoformat()}


@router.post("/shifts/check-out")
def check_out(user: User = Depends(worker_only)) -> dict:
    shift = services.check_out(user)
    return {"started": shift.start.isoformat(), "ended": shift.end.isoformat()}


@router.get("/me/shifts")
def my_shifts(user: User = Depends(worker_only)) -> list[dict]:
    return [{"start": s.start.isoformat(), "end": s.end.isoformat() if s.end else None}
            for s in db.shifts_of(user.id)[-14:]]


@router.get("/me/payslip")
def my_payslip(month: str | None = Query(None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
               user: User = Depends(worker_only)) -> dict:
    year, mon = map(int, month.split("-")) if month else (date.today().year, date.today().month)
    slip = services.payslip_for(user, year, mon)
    return slip | {"payment": payments.view(payments.paid_for(user.id, slip["period"]))}


@router.get("/me/wellbeing")
def my_wellbeing(user: User = Depends(worker_only)) -> dict:
    return services.fatigue_for(user)


@router.post("/hazards", status_code=201)
def report_hazard(body: HazardIn, user: User = Depends(worker_only)) -> dict:
    h = services.report_hazard(user, body.category, body.severity, body.description, body.location, body.anonymous)
    return services.hazard_view(h)


@router.get("/me/hazards")
def my_hazards(user: User = Depends(worker_only)) -> list[dict]:
    return [services.hazard_view(h) for h in services.reports_by(user)]


@router.post("/feedback", status_code=201)
def give_feedback(body: FeedbackIn, user: User = Depends(worker_only)) -> dict:
    services.submit_feedback(user, body.topic, body.rating, body.comment)
    return {"ok": True}


@router.get("/me/passport")
def my_passport(user: User = Depends(worker_only)) -> list[dict]:
    return [{"id": c.id, "skill": c.skill, "issuer": c.issuer, "issued": c.issued.isoformat(), "token": c.token}
            for c in db.credentials.values() if c.worker_id == user.id]


@router.post("/passport/verify")
def verify_credential(body: VerifyIn) -> dict:
    """Public: a new employer checks a scanned credential without an account."""
    claims = signer.verify(body.token)
    return {"valid": claims is not None, "claims": claims}
