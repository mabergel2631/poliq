from sqlalchemy import String, Integer, Date, DateTime, Boolean, ForeignKey, func, Text
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base


class Premium(Base):
    __tablename__ = "premiums"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    policy_id: Mapped[int] = mapped_column(Integer, ForeignKey("policies.id", ondelete="CASCADE"), index=True)
    amount: Mapped[int] = mapped_column(Integer)  # cents
    frequency: Mapped[str] = mapped_column(String(20))  # monthly, quarterly, semi_annual, annual
    due_date: Mapped[Date] = mapped_column(Date)
    paid_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    policy_id: Mapped[int] = mapped_column(Integer, ForeignKey("policies.id", ondelete="CASCADE"), index=True)
    claim_number: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(20))  # open, in_progress, closed, denied
    date_filed: Mapped[Date] = mapped_column(Date)
    date_resolved: Mapped[Date | None] = mapped_column(Date, nullable=True)
    amount_claimed: Mapped[int | None] = mapped_column(Integer, nullable=True)  # cents
    amount_paid: Mapped[int | None] = mapped_column(Integer, nullable=True)  # cents
    description: Mapped[str] = mapped_column(String(2000))
    notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())


class RenewalReminder(Base):
    __tablename__ = "renewal_reminders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    policy_id: Mapped[int] = mapped_column(Integer, ForeignKey("policies.id", ondelete="CASCADE"), index=True)
    remind_at: Mapped[Date] = mapped_column(Date)
    dismissed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(50))  # created, updated, deleted, uploaded, confirmed, filed
    entity_type: Mapped[str] = mapped_column(String(50))  # policy, document, claim, premium, etc.
    entity_id: Mapped[int] = mapped_column(Integer)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())


class PolicyShare(Base):
    __tablename__ = "policy_shares"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    policy_id: Mapped[int] = mapped_column(Integer, ForeignKey("policies.id", ondelete="CASCADE"), index=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    shared_with_email: Mapped[str] = mapped_column(String(255))
    permission: Mapped[str] = mapped_column(String(10))  # view, edit
    role_label: Mapped[str | None] = mapped_column(String(30), nullable=True)  # spouse, child, cpa, attorney, caregiver, broker, other
    expires_at: Mapped[Date | None] = mapped_column(Date, nullable=True)
    accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
