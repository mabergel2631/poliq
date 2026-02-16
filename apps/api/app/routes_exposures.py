from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload

from .auth import get_current_user
from .coverage_taxonomy import analyze_coverage_gaps, get_coverage_summary
from .db import get_db
from .models import User, Policy, Exposure
from .schemas import ExposureCreate, ExposureUpdate, ExposureOut

router = APIRouter(prefix="/exposures", tags=["exposures"])


@router.post("", response_model=ExposureOut, status_code=201)
def create_exposure(payload: ExposureCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    exposure = Exposure(**payload.model_dump(), user_id=user.id)
    db.add(exposure)
    db.commit()
    db.refresh(exposure)
    return exposure


@router.get("")
def list_exposures(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    exposures = db.execute(
        select(Exposure).where(Exposure.user_id == user.id).order_by(Exposure.name)
    ).scalars().all()

    if not exposures:
        return []

    # Batch aggregate: count + sum coverage per exposure in one query
    exposure_ids = [e.id for e in exposures]
    stats_rows = db.execute(
        select(
            Policy.exposure_id,
            func.count(Policy.id),
            func.coalesce(func.sum(Policy.coverage_amount), 0),
        )
        .where(Policy.exposure_id.in_(exposure_ids))
        .group_by(Policy.exposure_id)
    ).all()
    stats = {row[0]: (row[1], row[2]) for row in stats_rows}

    return [{
        "id": exp.id,
        "user_id": exp.user_id,
        "name": exp.name,
        "exposure_type": exp.exposure_type,
        "description": exp.description,
        "created_at": str(exp.created_at),
        "policy_count": stats.get(exp.id, (0, 0))[0],
        "total_coverage": stats.get(exp.id, (0, 0))[1],
    } for exp in exposures]


@router.get("/{exposure_id}")
def get_exposure(exposure_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    exposure = db.get(Exposure, exposure_id)
    if not exposure or exposure.user_id != user.id:
        raise HTTPException(status_code=404, detail="Exposure not found")

    # Get linked policies with contacts and details eagerly loaded
    policies = db.execute(
        select(Policy).where(Policy.exposure_id == exposure_id)
        .options(selectinload(Policy.contacts), selectinload(Policy.details))
        .order_by(Policy.id.desc())
    ).unique().scalars().all()

    # Build policy dicts for gap analysis
    policy_dicts = []
    policy_list = []
    for p in policies:
        policy_dicts.append({
            "id": p.id, "policy_type": p.policy_type, "carrier": p.carrier,
            "coverage_amount": p.coverage_amount, "deductible": p.deductible,
            "premium_amount": p.premium_amount,
            "renewal_date": str(p.renewal_date) if p.renewal_date else None,
            "created_at": str(p.created_at) if p.created_at else None,
            "contacts": [{"role": c.role, "name": c.name, "phone": c.phone} for c in p.contacts],
            "details": [{"field_name": d.field_name, "field_value": d.field_value} for d in p.details],
        })
        policy_list.append({
            "id": p.id, "carrier": p.carrier, "policy_type": p.policy_type,
            "policy_number": p.policy_number, "nickname": p.nickname,
            "coverage_amount": p.coverage_amount, "deductible": p.deductible,
            "premium_amount": p.premium_amount, "status": p.status,
            "renewal_date": str(p.renewal_date) if p.renewal_date else None,
        })

    gaps = analyze_coverage_gaps(policy_dicts) if policy_dicts else []
    summary = get_coverage_summary(policy_dicts) if policy_dicts else {}

    return {
        "id": exposure.id,
        "name": exposure.name,
        "exposure_type": exposure.exposure_type,
        "description": exposure.description,
        "created_at": str(exposure.created_at),
        "policies": policy_list,
        "gaps": gaps,
        "summary": summary,
    }


@router.put("/{exposure_id}", response_model=ExposureOut)
def update_exposure(exposure_id: int, payload: ExposureUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    exposure = db.get(Exposure, exposure_id)
    if not exposure or exposure.user_id != user.id:
        raise HTTPException(status_code=404, detail="Exposure not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(exposure, field, value)

    db.commit()
    db.refresh(exposure)
    return exposure


@router.delete("/{exposure_id}")
def delete_exposure(exposure_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    exposure = db.get(Exposure, exposure_id)
    if not exposure or exposure.user_id != user.id:
        raise HTTPException(status_code=404, detail="Exposure not found")

    db.delete(exposure)
    db.commit()
    return {"ok": True}
