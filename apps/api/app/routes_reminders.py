from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from .auth import get_current_user
from .db import get_db
from .models import Policy, User
from .models_features import RenewalReminder, Premium

router = APIRouter(prefix="/reminders", tags=["reminders"])


def ensure_reminders(policy_id: int, renewal_date: date | None, db: Session):
    """Delete old reminders and create new ones at 30/14/7 days before renewal."""
    db.execute(delete(RenewalReminder).where(RenewalReminder.policy_id == policy_id))
    if not renewal_date:
        return
    today = date.today()
    for days_before in [30, 14, 7]:
        remind_at = renewal_date - timedelta(days=days_before)
        if remind_at >= today:
            db.add(RenewalReminder(policy_id=policy_id, remind_at=remind_at))


@router.get("/active")
def active_reminders(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    today = date.today()
    rows = db.execute(
        select(RenewalReminder, Policy)
        .join(Policy, RenewalReminder.policy_id == Policy.id)
        .where(Policy.user_id == user.id)
        .where(RenewalReminder.dismissed == False)  # noqa: E712
        .where(RenewalReminder.remind_at <= today)
        .order_by(RenewalReminder.remind_at)
    ).all()

    return [
        {
            "id": r.id,
            "policy_id": r.policy_id,
            "remind_at": str(r.remind_at),
            "dismissed": r.dismissed,
            "created_at": str(r.created_at),
            "carrier": p.carrier,
            "policy_type": p.policy_type,
            "nickname": p.nickname,
            "renewal_date": str(p.renewal_date) if p.renewal_date else None,
        }
        for r, p in rows
    ]


@router.get("/smart")
def smart_reminders(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Generate contextual reminders: overdue premiums, upcoming renewals, annual reviews."""
    today = date.today()
    alerts = []

    policies = db.execute(
        select(Policy).where(Policy.user_id == user.id)
    ).scalars().all()

    for p in policies:
        label = p.nickname or p.carrier

        # Overdue premium (unpaid and past due)
        overdue = db.execute(
            select(Premium)
            .where(Premium.policy_id == p.id)
            .where(Premium.paid_date == None)  # noqa: E711
            .where(Premium.due_date < today)
            .order_by(Premium.due_date)
        ).scalars().first()
        if overdue:
            days_late = (today - overdue.due_date).days
            alerts.append({
                "type": "overdue_payment",
                "severity": "high" if days_late > 14 else "medium",
                "policy_id": p.id,
                "title": f"Overdue payment: {label}",
                "description": f"${overdue.amount / 100:.2f} was due {overdue.due_date} ({days_late} days ago)",
                "action": "Mark as paid or make payment",
            })

        # Upcoming premium (due within 7 days)
        upcoming_prem = db.execute(
            select(Premium)
            .where(Premium.policy_id == p.id)
            .where(Premium.paid_date == None)  # noqa: E711
            .where(Premium.due_date >= today)
            .where(Premium.due_date <= today + timedelta(days=7))
            .order_by(Premium.due_date)
        ).scalars().first()
        if upcoming_prem:
            days_until = (upcoming_prem.due_date - today).days
            alerts.append({
                "type": "upcoming_payment",
                "severity": "low",
                "policy_id": p.id,
                "title": f"Payment due soon: {label}",
                "description": f"${upcoming_prem.amount / 100:.2f} due in {days_until} day{'s' if days_until != 1 else ''} ({upcoming_prem.due_date})",
                "action": "Review payment",
            })

        # Renewal within 30 days
        if p.renewal_date:
            days_to_renewal = (p.renewal_date - today).days
            if 0 < days_to_renewal <= 30:
                alerts.append({
                    "type": "renewal",
                    "severity": "medium" if days_to_renewal <= 14 else "low",
                    "policy_id": p.id,
                    "title": f"Renewal approaching: {label}",
                    "description": f"Renews in {days_to_renewal} days ({p.renewal_date}). Shop for better rates now.",
                    "action": "Review policy before renewal",
                })
            elif days_to_renewal <= 0 and days_to_renewal > -30:
                alerts.append({
                    "type": "expired",
                    "severity": "high",
                    "policy_id": p.id,
                    "title": f"Policy may have expired: {label}",
                    "description": f"Renewal date was {p.renewal_date} ({abs(days_to_renewal)} days ago)",
                    "action": "Verify policy status with carrier",
                })

        # Annual review (policy older than 11 months without update)
        if p.created_at:
            from datetime import datetime
            created = p.created_at if isinstance(p.created_at, date) else p.created_at.date() if isinstance(p.created_at, datetime) else None
            if created and (today - created).days > 335 and (today - created).days % 365 < 30:
                alerts.append({
                    "type": "annual_review",
                    "severity": "low",
                    "policy_id": p.id,
                    "title": f"Annual review: {label}",
                    "description": "It's been about a year. Review coverage, limits, and beneficiaries.",
                    "action": "Review policy details",
                })

    # Sort by severity
    severity_order = {"high": 0, "medium": 1, "low": 2}
    alerts.sort(key=lambda a: severity_order.get(a["severity"], 3))
    return alerts


@router.put("/{reminder_id}/dismiss")
def dismiss_reminder(reminder_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    reminder = db.get(RenewalReminder, reminder_id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    policy = db.get(Policy, reminder.policy_id)
    if not policy or policy.user_id != user.id:
        raise HTTPException(status_code=404, detail="Reminder not found")

    reminder.dismissed = True
    db.commit()
    return {"ok": True}
