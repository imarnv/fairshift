"""Labour rules: overtime, fatigue, quit risk, hazard deadlines, fairness index."""

from datetime import date, datetime, timedelta, timezone

from app import payroll, safety, wellbeing
from app.store import Hazard, Shift

MON = datetime(2026, 10, 5, 8, tzinfo=timezone.utc)  # a Monday


def shifts(*hours: float, start: datetime = MON, gap_days: int = 1) -> list[Shift]:
    return [Shift(f"s{i}", "w", "s1", start + timedelta(days=i * gap_days),
                  start + timedelta(days=i * gap_days, hours=h)) for i, h in enumerate(hours)]


def test_no_overtime_within_limits():
    assert payroll.split_overtime(payroll.daily_hours(shifts(8, 8, 8, 8, 8, 8))) == (48, 0)


def test_daily_overtime_counts_hours_past_nine():
    regular, ot = payroll.split_overtime(payroll.daily_hours(shifts(10, 10, 10, 10, 10)))
    assert (regular, ot) == (45, 5)


def test_weekly_overtime_wins_when_larger():
    # 6 x 10h = 60h: 6h past the daily limit, but 12h past the weekly one
    assert payroll.split_overtime(payroll.daily_hours(shifts(10, 10, 10, 10, 10, 10))) == (48, 12)


def test_payslip_pays_overtime_double_and_deducts_pf():
    slip = payroll.payslip(shifts(10, 10, 10, 10, 10, 10), 100, 2026, 10)
    lines = {line["key"]: line["amount"] for line in slip["lines"]}
    assert lines["basic"] == 4800 and lines["overtime"] == 2400
    assert lines["pf"] == -576            # 12% of basic only
    assert lines["esi"] == -54            # 0.75% of 7200 gross
    assert slip["net"] == 7200 - 576 - 54


def test_payslip_ignores_other_months_and_open_shifts():
    open_shift = Shift("x", "w", "s1", MON)
    other = shifts(8, start=datetime(2026, 9, 1, 8, tzinfo=timezone.utc))
    assert payroll.payslip([open_shift, *other], 100, 2026, 10)["gross"] == 0


def test_rested_worker_is_ok():
    now = MON + timedelta(days=7)
    assert wellbeing.fatigue(shifts(8, 8, 8, 8, 8), now)["level"] == "ok"


def test_seven_days_without_rest_is_high():
    now = MON + timedelta(days=7)
    result = wellbeing.fatigue(shifts(8, 8, 8, 8, 8, 8, 8), now)
    assert result["level"] == "high"
    assert {"code": "no_rest_day", "value": 7} in result["reasons"]


def test_short_rest_between_back_to_back_shifts_is_flagged():
    night = Shift("a", "w", "s1", MON, MON + timedelta(hours=12))
    early = Shift("b", "w", "s1", MON + timedelta(hours=18), MON + timedelta(hours=26))  # 6h rest
    codes = [r["code"] for r in wellbeing.fatigue([night, early], MON + timedelta(days=2))["reasons"]]
    assert "short_rest" in codes


def test_quit_risk_explains_its_score():
    now = MON + timedelta(days=28)
    before = shifts(*[8] * 10, start=now - timedelta(days=27))
    risk = wellbeing.quit_risk(before, date(2020, 1, 1), "high", overdue_reports=1, site_rating=2.5, now=now)
    codes = {r["code"] for r in risk["reasons"]}
    assert codes == {"fatigue_high", "attendance_drop", "reports_ignored", "low_site_rating"}
    assert risk["score"] == 80 and risk["level"] == "high"


def test_quit_risk_is_low_for_a_settled_worker():
    now = MON + timedelta(days=28)
    steady = shifts(*[8] * 28, start=now - timedelta(days=28))
    assert wellbeing.quit_risk(steady, date(2020, 1, 1), "ok", 0, 4.2, now)["score"] == 0


def hazard(severity: str, hours_ago: float, now: datetime, resolved_after: float | None = None) -> Hazard:
    created = now - timedelta(hours=hours_ago)
    h = Hazard("h", "s1", None, "fall", severity, "x", "", created)
    if resolved_after is not None:
        h.status, h.resolved_at = "resolved", created + timedelta(hours=resolved_after)
    return h


def test_critical_hazard_escalates_up_the_chain():
    now = MON
    assert safety.escalation(hazard("critical", 2, now), now)["level"] == 0
    assert safety.escalation(hazard("critical", 6, now), now)["assigned_to"] == "Site manager"
    late = safety.escalation(hazard("critical", 9, now), now)
    assert late["overdue"] and late["assigned_to"] == "HR & Safety head"


def test_resolved_hazard_is_never_overdue():
    e = safety.escalation(hazard("high", 100, MON, resolved_after=10), MON)
    assert not e["overdue"] and e["met_deadline"]


def test_fairness_index_skips_missing_parts():
    assert wellbeing.fairness_index(1.0, 0.5, None) == 75
    assert wellbeing.fairness_index(None, 1.0, 5.0) == 100
