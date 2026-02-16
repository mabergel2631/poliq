from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), unique=True, index=True)

    # Personal info
    full_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address_street: Mapped[str | None] = mapped_column(String(300), nullable=True)
    address_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address_state: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address_zip: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Context flags for gap analysis
    is_homeowner: Mapped[bool] = mapped_column(Boolean, default=False)
    is_renter: Mapped[bool] = mapped_column(Boolean, default=False)
    has_dependents: Mapped[bool] = mapped_column(Boolean, default=False)
    has_vehicle: Mapped[bool] = mapped_column(Boolean, default=False)
    owns_business: Mapped[bool] = mapped_column(Boolean, default=False)
    high_net_worth: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class ProfileContact(Base):
    __tablename__ = "profile_contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)

    contact_type: Mapped[str] = mapped_column(String(20))  # "emergency" or "broker"
    name: Mapped[str] = mapped_column(String(200))
    relationship: Mapped[str | None] = mapped_column(String(100), nullable=True)  # for emergency contacts
    company: Mapped[str | None] = mapped_column(String(200), nullable=True)  # for brokers
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
