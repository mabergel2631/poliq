from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import get_current_user
from .db import get_db
from .models import Policy, User

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
