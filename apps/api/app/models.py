from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())


class Policy(Base):
    __tablename__ = "policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)

    scope: Mapped[str] = mapped_column(String(20), index=True)
    policy_type: Mapped[str] = mapped_column(String(50), index=True)
    carrier: Mapped[str] = mapped_column(String(120))
    policy_number: Mapped[str] = mapped_column(String(80), index=True)
    nickname: Mapped[str | None] = mapped_column(String(200), nullable=True)
    business_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    coverage_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deductible: Mapped[int | None] = mapped_column(Integer, nullable=True)
    premium_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Deductible tracking
    deductible_type: Mapped[str | None] = mapped_column(String(20), nullable=True)  # annual, per_incident
    deductible_period_start: Mapped[Date | None] = mapped_column(Date, nullable=True)
    deductible_applied: Mapped[int | None] = mapped_column(Integer, nullable=True)  # cents applied to deductible

    renewal_date: Mapped[Date | None] = mapped_column(Date, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())


class PolicyDetail(Base):
    __tablename__ = "policy_details"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    policy_id: Mapped[int] = mapped_column(Integer, ForeignKey("policies.id", ondelete="CASCADE"), index=True)
    field_name: Mapped[str] = mapped_column(String(100))
    field_value: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    policy_id: Mapped[int] = mapped_column(Integer, ForeignKey("policies.id", ondelete="CASCADE"), index=True)

    role: Mapped[str] = mapped_column(String(50))  # "broker", "agent", "claims", "underwriter"
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    company: Mapped[str | None] = mapped_column(String(200), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())


class CoverageItem(Base):
    __tablename__ = "coverage_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    policy_id: Mapped[int] = mapped_column(Integer, ForeignKey("policies.id", ondelete="CASCADE"), index=True)

    item_type: Mapped[str] = mapped_column(String(20))  # "inclusion" or "exclusion"
    description: Mapped[str] = mapped_column(String(1000))
    limit: Mapped[str | None] = mapped_column(String(200), nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
