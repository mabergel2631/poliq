import csv
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import get_current_user
from .db import get_db
from .models import Policy, Contact, CoverageItem, PolicyDetail, User
from .models_features import Premium, Claim

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/policies")
def export_all_policies(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    policies = db.execute(
        select(Policy).where(Policy.user_id == user.id).order_by(Policy.id)
    ).scalars().all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["ID", "Scope", "Type", "Carrier", "Policy Number", "Nickname", "Coverage Amount", "Deductible", "Renewal Date"])
    for p in policies:
        writer.writerow([p.id, p.scope, p.policy_type, p.carrier, p.policy_number, p.nickname or "", p.coverage_amount or "", p.deductible or "", str(p.renewal_date) if p.renewal_date else ""])

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=policies.csv"},
    )


@router.get("/policies/{policy_id}")
def export_single_policy(policy_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    policy = db.get(Policy, policy_id)
    if not policy or policy.user_id != user.id:
        raise HTTPException(status_code=404, detail="Policy not found")

    buf = io.StringIO()
    writer = csv.writer(buf)

    # Policy info
    writer.writerow(["POLICY"])
    writer.writerow(["ID", "Scope", "Type", "Carrier", "Policy Number", "Nickname", "Coverage Amount", "Deductible", "Renewal Date"])
    writer.writerow([policy.id, policy.scope, policy.policy_type, policy.carrier, policy.policy_number, policy.nickname or "", policy.coverage_amount or "", policy.deductible or "", str(policy.renewal_date) if policy.renewal_date else ""])
    writer.writerow([])

    # Contacts
    contacts = db.execute(select(Contact).where(Contact.policy_id == policy_id)).scalars().all()
    writer.writerow(["CONTACTS"])
    writer.writerow(["Role", "Name", "Company", "Phone", "Email", "Notes"])
    for c in contacts:
        writer.writerow([c.role, c.name or "", c.company or "", c.phone or "", c.email or "", c.notes or ""])
    writer.writerow([])

    # Coverage items
    items = db.execute(select(CoverageItem).where(CoverageItem.policy_id == policy_id)).scalars().all()
    writer.writerow(["COVERAGE ITEMS"])
    writer.writerow(["Type", "Description", "Limit"])
    for ci in items:
        writer.writerow([ci.item_type, ci.description, ci.limit or ""])
    writer.writerow([])

    # Details
    details = db.execute(select(PolicyDetail).where(PolicyDetail.policy_id == policy_id)).scalars().all()
    writer.writerow(["DETAILS"])
    writer.writerow(["Field", "Value"])
    for d in details:
        writer.writerow([d.field_name, d.field_value])
    writer.writerow([])

    # Premiums
    premiums = db.execute(select(Premium).where(Premium.policy_id == policy_id)).scalars().all()
    writer.writerow(["PREMIUMS"])
    writer.writerow(["Amount (cents)", "Frequency", "Due Date", "Paid Date", "Payment Method", "Notes"])
    for pr in premiums:
        writer.writerow([pr.amount, pr.frequency, str(pr.due_date), str(pr.paid_date) if pr.paid_date else "", pr.payment_method or "", pr.notes or ""])
    writer.writerow([])

    # Claims
    claims = db.execute(select(Claim).where(Claim.policy_id == policy_id)).scalars().all()
    writer.writerow(["CLAIMS"])
    writer.writerow(["Claim #", "Status", "Date Filed", "Date Resolved", "Amount Claimed", "Amount Paid", "Description", "Notes"])
    for cl in claims:
        writer.writerow([cl.claim_number, cl.status, str(cl.date_filed), str(cl.date_resolved) if cl.date_resolved else "", cl.amount_claimed or "", cl.amount_paid or "", cl.description, cl.notes or ""])

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=policy_{policy_id}.csv"},
    )
