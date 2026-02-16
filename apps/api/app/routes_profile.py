"""
User Profile API routes.
Manage personal info, context flags, emergency contacts, and broker contacts.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import Optional

from .auth import get_current_user
from .db import get_db
from .models import User
from .models_profile import UserProfile, ProfileContact
from .schemas import (
    UserProfileUpdate, UserProfileOut,
    ProfileContactCreate, ProfileContactUpdate, ProfileContactOut,
)

router = APIRouter(prefix="/profile", tags=["profile"])


def _get_or_create_profile(db: Session, user_id: int) -> UserProfile:
    """Return the user's profile, auto-creating an empty one if none exists."""
    profile = db.execute(
        select(UserProfile).where(UserProfile.user_id == user_id)
    ).scalar_one_or_none()
    if not profile:
        profile = UserProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("")
def get_profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Get profile + all contacts. Auto-creates empty profile if none exists."""
    profile = _get_or_create_profile(db, user.id)
    contacts = db.execute(
        select(ProfileContact).where(ProfileContact.user_id == user.id)
    ).scalars().all()
    return {
        "profile": UserProfileOut.model_validate(profile),
        "contacts": [ProfileContactOut.model_validate(c) for c in contacts],
    }


@router.put("")
def update_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update personal info and/or context flags (partial update)."""
    profile = _get_or_create_profile(db, user.id)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return UserProfileOut.model_validate(profile)


@router.get("/contacts")
def list_contacts(
    type: Optional[str] = Query(None, description="Filter by contact_type: emergency or broker"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List profile contacts, optionally filtered by type."""
    q = select(ProfileContact).where(ProfileContact.user_id == user.id)
    if type:
        q = q.where(ProfileContact.contact_type == type)
    contacts = db.execute(q).scalars().all()
    return [ProfileContactOut.model_validate(c) for c in contacts]


@router.post("/contacts")
def create_contact(
    payload: ProfileContactCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Add an emergency contact or broker."""
    if payload.contact_type not in ("emergency", "broker"):
        raise HTTPException(status_code=400, detail="contact_type must be 'emergency' or 'broker'")
    contact = ProfileContact(user_id=user.id, **payload.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return ProfileContactOut.model_validate(contact)


@router.put("/contacts/{contact_id}")
def update_contact(
    contact_id: int,
    payload: ProfileContactUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a profile contact."""
    contact = db.execute(
        select(ProfileContact).where(
            ProfileContact.id == contact_id,
            ProfileContact.user_id == user.id,
        )
    ).scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(contact, key, value)
    db.commit()
    db.refresh(contact)
    return ProfileContactOut.model_validate(contact)


@router.delete("/contacts/{contact_id}")
def delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Remove a profile contact."""
    contact = db.execute(
        select(ProfileContact).where(
            ProfileContact.id == contact_id,
            ProfileContact.user_id == user.id,
        )
    ).scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(contact)
    db.commit()
    return {"ok": True}


@router.get("/context")
def get_context_flags(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Lightweight endpoint — just context flags dict for gap analysis."""
    profile = db.execute(
        select(UserProfile).where(UserProfile.user_id == user.id)
    ).scalar_one_or_none()
    if not profile:
        return {}
    return {
        "is_homeowner": profile.is_homeowner,
        "is_renter": profile.is_renter,
        "has_dependents": profile.has_dependents,
        "has_vehicle": profile.has_vehicle,
        "owns_business": profile.owns_business,
        "high_net_worth": profile.high_net_worth,
    }


@router.get("/prefill/ice")
def get_ice_prefill(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Profile data formatted for ICE card pre-fill."""
    profile = db.execute(
        select(UserProfile).where(UserProfile.user_id == user.id)
    ).scalar_one_or_none()

    result = {
        "holder_name": "",
        "emergency_contact_name": "",
        "emergency_contact_phone": "",
    }

    if profile and profile.full_name:
        result["holder_name"] = profile.full_name

    # Find the first emergency contact for ICE pre-fill
    emergency_contact = db.execute(
        select(ProfileContact).where(
            ProfileContact.user_id == user.id,
            ProfileContact.contact_type == "emergency",
        )
    ).scalars().first()

    if emergency_contact:
        name = emergency_contact.name
        if emergency_contact.relationship:
            name += f" ({emergency_contact.relationship})"
        result["emergency_contact_name"] = name
        result["emergency_contact_phone"] = emergency_contact.phone or ""

    return result
