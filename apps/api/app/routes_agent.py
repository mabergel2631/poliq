from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, distinct
from sqlalchemy.orm import Session

from .auth import get_current_user
from .coverage_taxonomy import analyze_coverage_gaps, get_coverage_summary
from .db import get_db
from .models import User, Policy, Contact, PolicyDetail, Exposure
from .models_features import PolicyShare, CoverageScore

router = APIRouter(prefix="/agent", tags=["agent"])


def require_agent(user: User = Depends(get_current_user)) -> User:
    if user.role != "agent":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Agent role required")
    return user


def _policy_to_dict(p: Policy, contacts: list | None = None, details: list | None = None) -> dict:
    d = {
        "id": p.id,
        "user_id": p.user_id,
        "scope": p.scope,
        "policy_type": p.policy_type,
        "carrier": p.carrier,
        "policy_number": p.policy_number,
        "nickname": p.nickname,
        "coverage_amount": p.coverage_amount,
        "deductible": p.deductible,
        "premium_amount": p.premium_amount,
        "renewal_date": str(p.renewal_date) if p.renewal_date else None,
        "created_at": str(p.created_at) if p.created_at else None,
        "exposure_id": p.exposure_id,
        "status": p.status or "active",
    }
    if contacts is not None:
        d["contacts"] = [{"role": c.role, "name": c.name, "phone": c.phone, "email": c.email} for c in contacts]
    if details is not None:
        d["details"] = [{"field_name": dd.field_name, "field_value": dd.field_value} for dd in details]
    return d


def _get_client_ids(db: Session, agent_email: str) -> list[int]:
    """Get distinct owner_ids who shared with this agent as broker."""
    rows = db.execute(
        select(distinct(PolicyShare.owner_id)).where(
            PolicyShare.shared_with_email == agent_email,
            PolicyShare.role_label == "broker",
            PolicyShare.accepted == True,  # noqa: E712
        )
    ).scalars().all()
    return list(rows)


@router.get("/clients")
def list_clients(agent: User = Depends(require_agent), db: Session = Depends(get_db)):
    client_ids = _get_client_ids(db, agent.email)
    if not client_ids:
        return []

    clients = []
    for cid in client_ids:
        user = db.get(User, cid)
        if not user:
            continue
        policy_count = db.execute(
            select(func.count(Policy.id)).where(Policy.user_id == cid)
        ).scalar() or 0

        # Get overall score
        score_row = db.execute(
            select(CoverageScore.score_total).where(
                CoverageScore.user_id == cid,
                CoverageScore.category == "overall",
            )
        ).scalar()

        # Next renewal
        today = datetime.now().date()
        next_renewal = db.execute(
            select(func.min(Policy.renewal_date)).where(
                Policy.user_id == cid,
                Policy.renewal_date >= today,
            )
        ).scalar()

        clients.append({
            "id": user.id,
            "email": user.email,
            "policy_count": policy_count,
            "protection_score": score_row,
            "next_renewal": str(next_renewal) if next_renewal else None,
        })

    return clients


@router.get("/overview")
def agent_overview(agent: User = Depends(require_agent), db: Session = Depends(get_db)):
    client_ids = _get_client_ids(db, agent.email)

    total_clients = len(client_ids)
    if total_clients == 0:
        return {
            "total_clients": 0,
            "total_policies": 0,
            "avg_protection_score": None,
            "upcoming_renewals": 0,
        }

    total_policies = db.execute(
        select(func.count(Policy.id)).where(Policy.user_id.in_(client_ids))
    ).scalar() or 0

    # Average protection score across clients
    scores = db.execute(
        select(CoverageScore.score_total).where(
            CoverageScore.user_id.in_(client_ids),
            CoverageScore.category == "overall",
        )
    ).scalars().all()
    avg_score = round(sum(scores) / len(scores)) if scores else None

    # Upcoming renewals (next 60 days)
    today = datetime.now().date()
    cutoff = today + timedelta(days=60)
    upcoming = db.execute(
        select(func.count(Policy.id)).where(
            Policy.user_id.in_(client_ids),
            Policy.renewal_date >= today,
            Policy.renewal_date <= cutoff,
        )
    ).scalar() or 0

    return {
        "total_clients": total_clients,
        "total_policies": total_policies,
        "avg_protection_score": avg_score,
        "upcoming_renewals": upcoming,
    }


@router.get("/clients/{client_id}/summary")
def client_summary(client_id: int, agent: User = Depends(require_agent), db: Session = Depends(get_db)):
    # Verify agent has access to this client
    client_ids = _get_client_ids(db, agent.email)
    if client_id not in client_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access to this client")

    client = db.get(User, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Get all policies for the client
    policies = db.execute(
        select(Policy).where(Policy.user_id == client_id)
    ).scalars().all()

    # Build full policy dicts for gap analysis
    policy_dicts = []
    policy_list = []
    for p in policies:
        contacts = db.execute(select(Contact).where(Contact.policy_id == p.id)).scalars().all()
        details = db.execute(select(PolicyDetail).where(PolicyDetail.policy_id == p.id)).scalars().all()
        d = _policy_to_dict(p, contacts, details)
        policy_dicts.append(d)
        exposure_name = None
        if p.exposure_id:
            exp = db.get(Exposure, p.exposure_id)
            if exp:
                exposure_name = exp.name
        policy_list.append({
            "id": p.id,
            "carrier": p.carrier,
            "policy_type": p.policy_type,
            "policy_number": p.policy_number,
            "nickname": p.nickname,
            "coverage_amount": p.coverage_amount,
            "deductible": p.deductible,
            "premium_amount": p.premium_amount,
            "renewal_date": str(p.renewal_date) if p.renewal_date else None,
            "exposure_id": p.exposure_id,
            "exposure_name": exposure_name,
            "status": p.status or "active",
        })

    # Coverage score
    score_row = db.execute(
        select(CoverageScore.score_total).where(
            CoverageScore.user_id == client_id,
            CoverageScore.category == "overall",
        )
    ).scalar()

    # Gap analysis
    gaps = analyze_coverage_gaps(policy_dicts)
    summary = get_coverage_summary(policy_dicts)

    # Upcoming renewals
    today = datetime.now().date()
    renewals = []
    for p in policies:
        if p.renewal_date and p.renewal_date >= today:
            renewals.append({
                "policy_id": p.id,
                "carrier": p.carrier,
                "policy_type": p.policy_type,
                "renewal_date": str(p.renewal_date),
            })
    renewals.sort(key=lambda r: r["renewal_date"])

    return {
        "client": {"id": client.id, "email": client.email},
        "protection_score": score_row,
        "policies": policy_list,
        "gaps": gaps,
        "summary": summary,
        "upcoming_renewals": renewals,
    }
