from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from .auth import get_current_user
from .db import get_db
from .models import User
from .models_features import AuditLog

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/health")
def health():
    return {"ok": True, "service": "audit"}


@router.get("")
def list_audit(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    total = db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.user_id == user.id)
    ).scalar() or 0

    offset = (page - 1) * limit
    rows = db.execute(
        select(AuditLog)
        .where(AuditLog.user_id == user.id)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).scalars().all()

    return {
        "items": [
            {
                "id": r.id,
                "user_id": r.user_id,
                "action": r.action,
                "entity_type": r.entity_type,
                "entity_id": r.entity_id,
                "details": r.details,
                "created_at": str(r.created_at),
            }
            for r in rows
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }
