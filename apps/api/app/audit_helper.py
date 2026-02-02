from sqlalchemy.orm import Session
from .models_features import AuditLog


def log_action(db: Session, user_id: int, action: str, entity_type: str, entity_id: int, details: str | None = None):
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
    )
    db.add(entry)
    db.flush()
