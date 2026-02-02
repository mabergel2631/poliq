from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


# ── Auth ──────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Policies ──────────────────────────────────────────

class PolicyBase(BaseModel):
    scope: str
    policy_type: str
    carrier: str
    policy_number: str
    nickname: Optional[str] = None
    coverage_amount: Optional[int] = None
    deductible: Optional[int] = None
    premium_amount: Optional[int] = None
    renewal_date: Optional[date] = None


class PolicyCreate(PolicyBase):
    pass


class PolicyUpdate(BaseModel):
    scope: Optional[str] = None
    policy_type: Optional[str] = None
    carrier: Optional[str] = None
    policy_number: Optional[str] = None
    nickname: Optional[str] = None
    coverage_amount: Optional[int] = None
    deductible: Optional[int] = None
    premium_amount: Optional[int] = None
    renewal_date: Optional[date] = None


class PolicyOut(PolicyBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Contacts ──────────────────────────────────────────

class ContactBase(BaseModel):
    role: str
    name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    role: Optional[str] = None
    name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


class ContactOut(ContactBase):
    id: int
    policy_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Coverage Items (Inclusions/Exclusions) ────────────

class CoverageItemBase(BaseModel):
    item_type: str  # "inclusion" or "exclusion"
    description: str
    limit: Optional[str] = None


class CoverageItemCreate(CoverageItemBase):
    pass


class CoverageItemUpdate(BaseModel):
    item_type: Optional[str] = None
    description: Optional[str] = None
    limit: Optional[str] = None


class CoverageItemOut(CoverageItemBase):
    id: int
    policy_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Policy Details (key-value extended fields) ────

class PolicyDetailBase(BaseModel):
    field_name: str
    field_value: str


class PolicyDetailCreate(PolicyDetailBase):
    pass


class PolicyDetailUpdate(BaseModel):
    field_name: Optional[str] = None
    field_value: Optional[str] = None


class PolicyDetailOut(PolicyDetailBase):
    id: int
    policy_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Premiums ─────────────────────────────────────────

class PremiumBase(BaseModel):
    amount: int  # cents
    frequency: str  # monthly, quarterly, semi_annual, annual
    due_date: date
    paid_date: Optional[date] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class PremiumCreate(PremiumBase):
    pass


class PremiumUpdate(BaseModel):
    amount: Optional[int] = None
    frequency: Optional[str] = None
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class PremiumOut(PremiumBase):
    id: int
    policy_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Claims ───────────────────────────────────────────

class ClaimBase(BaseModel):
    claim_number: str
    status: str  # open, in_progress, closed, denied
    date_filed: date
    date_resolved: Optional[date] = None
    amount_claimed: Optional[int] = None  # cents
    amount_paid: Optional[int] = None  # cents
    description: str
    notes: Optional[str] = None


class ClaimCreate(ClaimBase):
    pass


class ClaimUpdate(BaseModel):
    claim_number: Optional[str] = None
    status: Optional[str] = None
    date_filed: Optional[date] = None
    date_resolved: Optional[date] = None
    amount_claimed: Optional[int] = None
    amount_paid: Optional[int] = None
    description: Optional[str] = None
    notes: Optional[str] = None


class ClaimOut(ClaimBase):
    id: int
    policy_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Renewal Reminders ────────────────────────────────

class ReminderOut(BaseModel):
    id: int
    policy_id: int
    remind_at: date
    dismissed: bool
    created_at: datetime
    carrier: Optional[str] = None
    policy_type: Optional[str] = None
    nickname: Optional[str] = None

    class Config:
        from_attributes = True


# ── Audit Log ────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: int
    user_id: int
    action: str
    entity_type: str
    entity_id: int
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogPage(BaseModel):
    items: List[AuditLogOut]
    total: int
    page: int
    limit: int


# ── Policy Sharing ───────────────────────────────────

class ShareCreate(BaseModel):
    shared_with_email: str
    permission: str = "view"  # view or edit
    role_label: Optional[str] = None  # spouse, child, cpa, attorney, caregiver, broker, other
    expires_at: Optional[date] = None


class ShareOut(BaseModel):
    id: int
    policy_id: int
    owner_id: int
    shared_with_email: str
    permission: str
    role_label: Optional[str] = None
    expires_at: Optional[date] = None
    accepted: bool
    created_at: datetime

    class Config:
        from_attributes = True
