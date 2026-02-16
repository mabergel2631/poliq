from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import get_current_user
from .db import get_db
from .models import Policy, User
from .models_features import PolicyShare
from .schemas import ShareCreate, ShareOut

router = APIRouter(tags=["sharing"])


@router.post("/policies/{policy_id}/share", response_model=ShareOut, status_code=201)
def share_policy(policy_id: int, payload: ShareCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    policy = db.get(Policy, policy_id)
    if not policy or policy.user_id != user.id:
        raise HTTPException(status_code=404, detail="Policy not found")

    # Don't share with yourself
    if payload.shared_with_email == user.email:
        raise HTTPException(status_code=400, detail="Cannot share with yourself")

    # Check for existing share
    existing = db.execute(
        select(PolicyShare)
        .where(PolicyShare.policy_id == policy_id)
        .where(PolicyShare.shared_with_email == payload.shared_with_email)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Already shared with this user")

    share = PolicyShare(
        policy_id=policy_id,
        owner_id=user.id,
        shared_with_email=payload.shared_with_email,
        permission=payload.permission,
        role_label=payload.role_label if hasattr(payload, 'role_label') else None,
        expires_at=payload.expires_at if hasattr(payload, 'expires_at') else None,
    )
    db.add(share)
    db.commit()
    db.refresh(share)
    return share


@router.get("/policies/{policy_id}/shares", response_model=list[ShareOut])
def list_shares(policy_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    policy = db.get(Policy, policy_id)
    if not policy or policy.user_id != user.id:
        raise HTTPException(status_code=404, detail="Policy not found")

    rows = db.execute(
        select(PolicyShare).where(PolicyShare.policy_id == policy_id)
    ).scalars().all()
    return rows


@router.get("/policies/shared-with-me")
def shared_with_me(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    today = date.today()
    rows = db.execute(
        select(PolicyShare, Policy)
        .join(Policy, PolicyShare.policy_id == Policy.id)
        .where(PolicyShare.shared_with_email == user.email)
        .where(PolicyShare.accepted == True)  # noqa: E712
        .where(
            (PolicyShare.expires_at.is_(None)) | (PolicyShare.expires_at >= today)
        )
    ).all()

    return [
        {
            "share_id": s.id,
            "permission": s.permission,
            "policy": {
                "id": p.id,
                "user_id": p.user_id,
                "scope": p.scope,
                "policy_type": p.policy_type,
                "carrier": p.carrier,
                "policy_number": p.policy_number,
                "nickname": p.nickname,
                "coverage_amount": p.coverage_amount,
                "deductible": p.deductible,
                "renewal_date": str(p.renewal_date) if p.renewal_date else None,
                "created_at": str(p.created_at),
            },
        }
        for s, p in rows
    ]


@router.get("/shares/pending")
def pending_shares(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    today = date.today()
    rows = db.execute(
        select(PolicyShare, Policy)
        .join(Policy, PolicyShare.policy_id == Policy.id)
        .where(PolicyShare.shared_with_email == user.email)
        .where(PolicyShare.accepted == False)  # noqa: E712
        .where(
            (PolicyShare.expires_at.is_(None)) | (PolicyShare.expires_at >= today)
        )
    ).all()

    return [
        {
            "share_id": s.id,
            "permission": s.permission,
            "owner_id": s.owner_id,
            "policy": {
                "id": p.id,
                "carrier": p.carrier,
                "policy_type": p.policy_type,
                "nickname": p.nickname,
            },
        }
        for s, p in rows
    ]


@router.put("/shares/{share_id}/accept")
def accept_share(share_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    share = db.get(PolicyShare, share_id)
    if not share or share.shared_with_email != user.email:
        raise HTTPException(status_code=404, detail="Share not found")

    share.accepted = True
    db.commit()
    return {"ok": True}


@router.delete("/shares/{share_id}")
def revoke_share(share_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    share = db.get(PolicyShare, share_id)
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")

    # Owner or shared-with user can revoke
    if share.owner_id != user.id and share.shared_with_email != user.email:
        raise HTTPException(status_code=404, detail="Share not found")

    db.delete(share)
    db.commit()
    return {"ok": True}
