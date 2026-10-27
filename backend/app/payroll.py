"""Payslips that show their working.

Overtime follows the Factories Act, 1948: more than 9 hours in a day (s.54) or 48
in a week (s.51) is overtime, paid at twice the ordinary rate (s.59). Each line of
the payslip carries a `key` the app translates and reads aloud, so a worker hears
why each rupee is there, not just the total.
"""

from collections import defaultdict
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from .store import Shift

DAILY_LIMIT_H = 9
WEEKLY_LIMIT_H = 48
OVERTIME_MULTIPLIER = 2
PF_RATE = Decimal("0.12")        # EPF, employee share of basic wages
ESI_RATE = Decimal("0.0075")     # ESI, employee share
ESI_WAGE_CEILING = Decimal(21000)  # monthly gross above which ESI does not apply


def shift_hours(s: Shift) -> float:
    return (s.end - s.start).total_seconds() / 3600 if s.end else 0.0


def daily_hours(shifts: list[Shift]) -> dict[date, float]:
    """Hours per calendar day; a shift that crosses midnight counts on the day it began."""
    days: dict[date, float] = defaultdict(float)
    for s in shifts:
        days[s.start.date()] += shift_hours(s)
    return dict(days)


def split_overtime(days: dict[date, float]) -> tuple[float, float]:
    """(regular, overtime) hours. Within each ISO week overtime is whichever is
    larger: the hours past 9 on each day, or the hours past 48 for the week."""
    weeks: dict[tuple[int, int], list[float]] = defaultdict(list)
    for d, h in days.items():
        weeks[d.isocalendar()[:2]].append(h)
    total = overtime = 0.0
    for hours in weeks.values():
        daily_excess = sum(max(0.0, h - DAILY_LIMIT_H) for h in hours)
        weekly_excess = max(0.0, sum(hours) - WEEKLY_LIMIT_H)
        overtime += max(daily_excess, weekly_excess)
        total += sum(hours)
    return total - overtime, overtime


def _money(x: Decimal) -> Decimal:
    return x.quantize(Decimal("0.01"), ROUND_HALF_UP)


def payslip(shifts: list[Shift], hourly_rate: float, year: int, month: int) -> dict:
    # Limit: a week split across two months is judged only on its days inside
    # this month, so a 48h week straddling the 1st can under-count overtime.
    in_month = [s for s in shifts if s.end and (s.start.year, s.start.month) == (year, month)]
    regular_h, overtime_h = split_overtime(daily_hours(in_month))
    rate = Decimal(str(hourly_rate))
    basic = _money(rate * Decimal(str(regular_h)))
    overtime_pay = _money(rate * OVERTIME_MULTIPLIER * Decimal(str(overtime_h)))
    gross = basic + overtime_pay
    pf = _money(basic * PF_RATE)
    esi = _money(gross * ESI_RATE) if gross <= ESI_WAGE_CEILING else Decimal(0)
    net = gross - pf - esi
    return {
        "period": f"{year}-{month:02d}",
        "days_worked": len({s.start.date() for s in in_month}),
        "regular_hours": round(regular_h, 1),
        "overtime_hours": round(overtime_h, 1),
        "hourly_rate": float(rate),
        "lines": [
            {"key": "basic", "amount": float(basic), "detail": f"{regular_h:.1f} h × ₹{rate}"},
            {"key": "overtime", "amount": float(overtime_pay),
             "detail": f"{overtime_h:.1f} h × ₹{rate} × {OVERTIME_MULTIPLIER}"},
            {"key": "pf", "amount": -float(pf), "detail": "12% of basic"},
            {"key": "esi", "amount": -float(esi) if esi else 0.0,
             "detail": "0.75% of gross" if esi else "not applicable: gross above ₹21,000"},
        ],
        "gross": float(gross),
        "net": float(net),
    }
