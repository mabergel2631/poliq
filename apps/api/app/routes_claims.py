from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import get_current_user
from .db import get_db
from .models import Policy, User
from .models_features import Claim
from .schemas import ClaimCreate, ClaimUpdate, ClaimOut
from .audit_helper import log_action

router = APIRouter(prefix="/policies/{policy_id}/claims", tags=["claims"])


def _get_user_policy(policy_id: int, db: Session, user: User) -> Policy:
    policy = db.get(Policy, policy_id)
    if not policy or policy.user_id != user.id:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy


@router.get("", response_model=list[ClaimOut])
def list_claims(policy_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _get_user_policy(policy_id, db, user)
    rows = db.execute(
        select(Claim).where(Claim.policy_id == policy_id).order_by(Claim.date_filed.desc())
    ).scalars().all()
    return rows


@router.post("", response_model=ClaimOut, status_code=201)
def create_claim(policy_id: int, payload: ClaimCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _get_user_policy(policy_id, db, user)
    claim = Claim(policy_id=policy_id, **payload.model_dump())
    db.add(claim)
    db.flush()
    log_action(db, user.id, "filed", "claim", claim.id)
    db.commit()
    db.refresh(claim)
    return claim


@router.put("/{claim_id}", response_model=ClaimOut)
def update_claim(policy_id: int, claim_id: int, payload: ClaimUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _get_user_policy(policy_id, db, user)
    claim = db.get(Claim, claim_id)
    if not claim or claim.policy_id != policy_id:
        raise HTTPException(status_code=404, detail="Claim not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(claim, field, value)
    log_action(db, user.id, "updated", "claim", claim.id)
    db.commit()
    db.refresh(claim)
    return claim


@router.delete("/{claim_id}")
def delete_claim(policy_id: int, claim_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _get_user_policy(policy_id, db, user)
    claim = db.get(Claim, claim_id)
    if not claim or claim.policy_id != policy_id:
        raise HTTPException(status_code=404, detail="Claim not found")
    db.delete(claim)
    db.commit()
    return {"ok": True}
