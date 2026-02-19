from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .auth import get_current_user
from .db import get_db
from .email_renewals import send_renewal_reminders
from .models import Policy, Contact, User
from .models_features import PolicyDelta

router = APIRouter(prefix="/renewals", tags=["renewals"])


@router.get("/upcoming")
def upcoming_renewals(days: int = Query(default=30, ge=1, le=365), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    today = date.today()
    cutoff = today + timedelta(days=days)

    rows = db.execute(
        select(Policy)
        .where(Policy.user_id == user.id)
        .where(Policy.renewal_date != None)  # noqa: E711
        .where(Policy.renewal_date >= today)
        .where(Policy.renewal_date <= cutoff)
        .order_by(Policy.renewal_date)
    ).scalars().all()

    return [
        {
            "id": p.id,
            "carrier": p.carrier,
            "policy_type": p.policy_type,
            "policy_number": p.policy_number,
            "nickname": p.nickname,
            "renewal_date": str(p.renewal_date),
            "coverage_amount": p.coverage_amount,
        }
        for p in rows
    ]


@router.get("/summary")
def renewal_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Renewal change summary — policies renewing in the next 90 days
    with any detected changes (PolicyDeltas) attached.
    """
    today = date.today()
    cutoff = today + timedelta(days=90)

    policies = db.execute(
        select(Policy)
        .where(Policy.user_id == user.id)
        .where(Policy.renewal_date != None)  # noqa: E711
        .where(Policy.renewal_date >= today)
        .where(Policy.renewal_date <= cutoff)
        .options(selectinload(Policy.contacts))
        .order_by(Policy.renewal_date)
    ).unique().scalars().all()

    policy_ids = [p.id for p in policies]

    # Load deltas for these policies from the last 90 days
    deltas_by_policy: dict[int, list] = {pid: [] for pid in policy_ids}
    if policy_ids:
        delta_cutoff = today - timedelta(days=90)
        deltas = db.execute(
            select(PolicyDelta)
            .where(PolicyDelta.policy_id.in_(policy_ids))
            .where(PolicyDelta.created_at >= delta_cutoff)
            .order_by(PolicyDelta.created_at.desc())
        ).scalars().all()
        for d in deltas:
            deltas_by_policy[d.policy_id].append(d)

    result = []
    total_with_changes = 0
    for p in policies:
        # Find agent/broker contact
        agent_name = None
        agent_phone = None
        for c in p.contacts:
            if c.role in ("agent", "broker", "named_insured"):
                agent_name = c.name
                agent_phone = c.phone
                break

        changes = [
            {
                "id": d.id,
                "field_key": d.field_key,
                "old_value": d.old_value,
                "new_value": d.new_value,
                "delta_type": d.delta_type,
                "severity": d.severity,
                "created_at": str(d.created_at.date()) if d.created_at else None,
            }
            for d in deltas_by_policy.get(p.id, [])
        ]

        if changes:
            total_with_changes += 1

        days_until = (p.renewal_date - today).days

        result.append({
            "id": p.id,
            "carrier": p.carrier,
            "policy_type": p.policy_type,
            "policy_number": p.policy_number,
            "nickname": p.nickname,
            "renewal_date": str(p.renewal_date),
            "days_until_renewal": days_until,
            "coverage_amount": p.coverage_amount,
            "deductible": p.deductible,
            "premium_amount": p.premium_amount,
            "agent_name": agent_name,
            "agent_phone": agent_phone,
            "changes": changes,
        })

    return {
        "policies": result,
        "total_renewing": len(result),
        "total_with_changes": total_with_changes,
    }


@router.post("/send-reminders")
async def trigger_renewal_reminders(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    result = await send_renewal_reminders(db)
    return result
