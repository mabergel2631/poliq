import logging
logging.basicConfig(level=logging.DEBUG)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db import engine, Base
from app.models import User, Policy, Contact, CoverageItem, PolicyDetail  # noqa: F401 — register models
from app.models_documents import Document  # noqa: F401
from app.models_features import Premium, Claim, RenewalReminder, AuditLog, PolicyShare  # noqa: F401

from app.routes_auth import router as auth_router
from app.routes_policies import router as policies_router
from app.routes_documents_upload import router as documents_router
from app.routes_audit import router as audit_router
from app.routes_contacts import router as contacts_router
from app.routes_extraction import router as extraction_router
from app.routes_renewals import router as renewals_router
from app.routes_coverage import router as coverage_router
from app.routes_policy_details import router as policy_details_router
from app.routes_premiums import router as premiums_router
from app.routes_claims import router as claims_router
from app.routes_reminders import router as reminders_router
from app.routes_export import router as export_router
from app.routes_sharing import router as sharing_router
from app.routes_files import router as files_router

app = FastAPI(title="Keeps API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # Add nickname column to existing policies table if missing
    from sqlalchemy import inspect, text
    insp = inspect(engine)
    if "policies" in insp.get_table_names():
        cols = [c["name"] for c in insp.get_columns("policies")]
        with engine.begin() as conn:
            if "nickname" not in cols:
                conn.execute(text("ALTER TABLE policies ADD COLUMN nickname VARCHAR(200)"))
            if "premium_amount" not in cols:
                conn.execute(text("ALTER TABLE policies ADD COLUMN premium_amount INTEGER"))
    if "policy_shares" in insp.get_table_names():
        share_cols = [c["name"] for c in insp.get_columns("policy_shares")]
        with engine.begin() as conn:
            if "role_label" not in share_cols:
                conn.execute(text("ALTER TABLE policy_shares ADD COLUMN role_label VARCHAR(30)"))
            if "expires_at" not in share_cols:
                conn.execute(text("ALTER TABLE policy_shares ADD COLUMN expires_at DATE"))


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": str(exc)})

app.include_router(files_router)
app.include_router(auth_router)
app.include_router(export_router)
app.include_router(sharing_router)
app.include_router(policies_router)
app.include_router(documents_router)
app.include_router(contacts_router)
app.include_router(extraction_router)
app.include_router(audit_router)
app.include_router(renewals_router)
app.include_router(coverage_router)
app.include_router(policy_details_router)
app.include_router(premiums_router)
app.include_router(claims_router)
app.include_router(reminders_router)
