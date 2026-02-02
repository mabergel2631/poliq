"""
Swappable LLM extraction service for insurance policy PDFs.
Supports Anthropic (Claude) and OpenAI. Controlled by LLM_PROVIDER env var.
"""

import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

from .config import settings

SYSTEM_PROMPT = """You are an expert insurance policy document parser. Your job is to extract EVERY piece of useful data from insurance policy documents. Be thorough and aggressive — extract as much as possible.

Return ONLY valid JSON with this exact schema (use null for missing fields):
{
  "carrier": "string or null - the full, correct insurance company name (e.g. 'State Farm Mutual Automobile Insurance Company', 'Allstate Insurance Company')",
  "policy_number": "string or null - the policy number, certificate number, or policy ID",
  "policy_type": "string or null - one of: auto, home, life, liability, umbrella, workers_comp, other",
  "scope": "string or null - personal or business",
  "coverage_amount": "integer or null - the COVERAGE LIMIT (max payout), NOT the premium. For auto this is the liability limit. For home this is the dwelling coverage. Example: 300000 for $300k coverage",
  "deductible": "integer or null - primary deductible in dollars",
  "renewal_date": "string or null - YYYY-MM-DD format (policy expiration or renewal date)",
  "effective_date": "string or null - YYYY-MM-DD format (policy start/effective date)",
  "named_insured": "string or null - primary named insured on the policy",
  "payment_schedule": "string or null - e.g. monthly, quarterly, semi-annual, annual",
  "premium_amount": "integer or null - the PREMIUM (what the customer PAYS). This is the total cost of the policy for the term. NOT the coverage limit. Example: 1200 for $1,200/year premium",
  "contacts": [
    {
      "role": "string - one of: broker, agent, claims, underwriter, customer_service, other",
      "name": "string or null",
      "company": "string or null",
      "phone": "string or null - include area code, format as (XXX) XXX-XXXX",
      "email": "string or null"
    }
  ],
  "inclusions": [
    {
      "description": "string - what is covered",
      "limit": "string or null - coverage limit for this item (include dollar amounts)"
    }
  ],
  "exclusions": [
    {
      "description": "string - what is excluded"
    }
  ],
  "details": [
    {
      "field_name": "string",
      "field_value": "string"
    }
  ]
}

CRITICAL INSTRUCTIONS:
1. CONTACTS: Extract EVERY phone number and email in the document. Look for:
   - Claims phone numbers (often toll-free 1-800/1-888 numbers)
   - Agent name, phone, email, and agency name
   - Broker information
   - Customer service numbers
   - Roadside assistance numbers
   - Any "call us at" or "contact" phone numbers
   - Even if the same number appears in different contexts, extract it with the appropriate role
   If you find a phone number but aren't sure of the role, use "customer_service" or "other"

2. CARRIER NAME: Use the FULL legal company name as printed on the declarations page, not abbreviations

3. COVERAGE: Extract EVERY coverage line item as inclusions with their limits (e.g., "Bodily Injury Liability - $100,000/$300,000", "Comprehensive - $500 deductible")

4. DETAILS: Extract ALL of these type-specific fields when present:
   - auto: For EACH vehicle on the policy, use numbered fields: vehicle_1_description, vehicle_1_VIN, vehicle_2_description, vehicle_2_VIN, etc. Format vehicle descriptions as "YEAR MAKE MODEL" (e.g. "2022 Toyota Camry"). Also extract: listed_drivers (comma-separated list of ALL drivers on the policy, e.g. "John Smith, Jane Smith, Alex Smith"), garaging_address, usage_type, liability_limit, collision_deductible, comprehensive_deductible, uninsured_motorist, medical_payments, roadside_assistance
   - home: year_built, square_footage, construction_type, roof_type, roof_age, stories, alarm_system, property_address, dwelling_coverage, personal_property_coverage, liability_coverage, medical_payments, replacement_cost, actual_cash_value
   - life: insured_name, beneficiary, contingent_beneficiary, face_value, term_length, cash_value, policy_owner, policy_subtype (e.g. "Term Life", "Whole Life", "Universal Life")
   - liability/umbrella: underlying_policies, aggregate_limit, per_occurrence_limit, employer_liability_limit
   - workers_comp: business_name, classification_code, payroll_amount, experience_modifier, state, employer_liability_limit
   Also extract: additional_insured, mortgage_company, lienholder, loss_payee — any entity with a financial interest

5. Be extremely thorough. It is better to extract too much than too little.

6. CRITICAL — premium vs coverage: Do NOT confuse these two fields:
   - coverage_amount = the COVERAGE LIMIT (maximum the insurer will pay on a claim). This is usually a large number like $100,000 or $300,000.
   - premium_amount = the PREMIUM COST (what the policyholder pays for the insurance). This is the price/cost and is usually much smaller, like $800 or $2,400.
   If you only see one dollar amount and it looks like a price/cost the customer pays, put it in premium_amount. If it looks like a coverage limit, put it in coverage_amount.

Return ONLY the JSON object, no markdown fences or explanation."""


@dataclass
class ExtractedContact:
    role: str
    name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


@dataclass
class ExtractedCoverageItem:
    item_type: str  # "inclusion" or "exclusion"
    description: str
    limit: Optional[str] = None


@dataclass
class ExtractedDetail:
    field_name: str
    field_value: str


@dataclass
class ExtractionResult:
    carrier: Optional[str] = None
    policy_number: Optional[str] = None
    policy_type: Optional[str] = None
    scope: Optional[str] = None
    coverage_amount: Optional[int] = None
    deductible: Optional[int] = None
    renewal_date: Optional[str] = None
    premium_amount: Optional[int] = None
    contacts: list[ExtractedContact] = field(default_factory=list)
    coverage_items: list[ExtractedCoverageItem] = field(default_factory=list)
    details: list[ExtractedDetail] = field(default_factory=list)
    raw_response: str = ""


class BaseExtractor(ABC):
    @abstractmethod
    def extract(self, text: str) -> ExtractionResult:
        ...


class AnthropicExtractor(BaseExtractor):
    def extract(self, text: str) -> ExtractionResult:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Extract data from this insurance policy document:\n\n{text[:50000]}"}],
        )
        raw = message.content[0].text
        return _parse_response(raw)

    def extract_images(self, images: list[bytes]) -> ExtractionResult:
        import anthropic, base64
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        content: list[dict] = [{"type": "text", "text": "Extract data from this insurance policy document (scanned pages):"}]
        for img in images[:20]:  # cap at 20 pages
            content.append({"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": base64.b64encode(img).decode()}})
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": content}],
        )
        raw = message.content[0].text
        return _parse_response(raw)


class OpenAIExtractor(BaseExtractor):
    def extract(self, text: str) -> ExtractionResult:
        import openai
        client = openai.OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=4096,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Extract data from this insurance policy document:\n\n{text[:50000]}"},
            ],
        )
        raw = response.choices[0].message.content or ""
        return _parse_response(raw)

    def extract_images(self, images: list[bytes]) -> ExtractionResult:
        import openai, base64
        client = openai.OpenAI(api_key=settings.openai_api_key)
        content: list[dict] = [{"type": "text", "text": "Extract data from this insurance policy document (scanned pages):"}]
        for img in images[:20]:
            content.append({"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64.b64encode(img).decode()}"}})
        response = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=4096,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": content},
            ],
        )
        raw = response.choices[0].message.content or ""
        return _parse_response(raw)


def get_extractor() -> BaseExtractor:
    provider = settings.llm_provider.lower()
    if provider == "openai":
        return OpenAIExtractor()
    return AnthropicExtractor()


def _parse_response(raw: str) -> ExtractionResult:
    raw = raw.strip()
    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

    data = json.loads(raw)

    contacts = []
    for c in data.get("contacts") or []:
        contacts.append(ExtractedContact(
            role=c.get("role", "other"),
            name=c.get("name"),
            company=c.get("company"),
            phone=c.get("phone"),
            email=c.get("email"),
        ))

    coverage_items = []
    for inc in data.get("inclusions") or []:
        coverage_items.append(ExtractedCoverageItem(
            item_type="inclusion",
            description=inc.get("description", ""),
            limit=inc.get("limit"),
        ))
    for exc in data.get("exclusions") or []:
        coverage_items.append(ExtractedCoverageItem(
            item_type="exclusion",
            description=exc.get("description", ""),
        ))

    # Debug: write raw extraction to file
    from pathlib import Path
    debug_path = Path(__file__).resolve().parent.parent / "last_extraction.json"
    debug_path.write_text(json.dumps(data, indent=2, default=str))

    premium_amount = int(data["premium_amount"]) if data.get("premium_amount") else None

    details = []
    # Add top-level enriched fields as details
    for extra_field in ["effective_date", "named_insured", "payment_schedule"]:
        val = data.get(extra_field)
        if val:
            details.append(ExtractedDetail(field_name=extra_field, field_value=str(val)))

    # Post-process details: group duplicate vehicle fields into numbered vehicles,
    # consolidate driver_name entries into listed_drivers
    raw_details = data.get("details") or []
    vehicle_fields = {"year", "make", "model", "VIN", "vehicle_description", "mileage",
                      "usage_type", "collision_deductible", "comprehensive_deductible", "garaging_address"}
    # Collect vehicles by scanning for repeated vehicle_description or year/make/model groups
    vehicles: list[dict] = []
    current_vehicle: dict = {}
    drivers: list[str] = []
    other_details: list[dict] = []

    for d in raw_details:
        fn = d.get("field_name", "")
        fv = d.get("field_value", "")
        if not fn or not fv:
            continue
        # Already numbered (vehicle_1_description etc.) — pass through
        if fn.startswith("vehicle_") and "_" in fn[8:]:
            other_details.append(d)
        elif fn == "listed_drivers":
            drivers.extend([x.strip() for x in fv.split(",") if x.strip()])
        elif fn == "driver_name":
            drivers.append(fv)
        elif fn in vehicle_fields:
            # If we see a field that's already in current_vehicle, start a new vehicle
            if fn in current_vehicle:
                vehicles.append(current_vehicle)
                current_vehicle = {}
            current_vehicle[fn] = fv
        else:
            other_details.append(d)

    if current_vehicle:
        vehicles.append(current_vehicle)

    # Emit numbered vehicle fields
    for i, veh in enumerate(vehicles, 1):
        desc = veh.get("vehicle_description") or " ".join(
            filter(None, [veh.get("year"), veh.get("make"), veh.get("model")])
        )
        if desc:
            details.append(ExtractedDetail(field_name=f"vehicle_{i}_description", field_value=desc))
        if veh.get("VIN"):
            details.append(ExtractedDetail(field_name=f"vehicle_{i}_VIN", field_value=veh["VIN"]))

    # Emit listed_drivers
    if drivers:
        details.append(ExtractedDetail(field_name="listed_drivers", field_value=", ".join(drivers)))

    # Emit remaining details
    for d in other_details:
        details.append(ExtractedDetail(field_name=d["field_name"], field_value=d["field_value"]))

    return ExtractionResult(
        carrier=data.get("carrier"),
        policy_number=data.get("policy_number"),
        policy_type=data.get("policy_type"),
        scope=data.get("scope"),
        coverage_amount=int(data["coverage_amount"]) if data.get("coverage_amount") else None,
        deductible=int(data["deductible"]) if data.get("deductible") else None,
        renewal_date=data.get("renewal_date"),
        premium_amount=premium_amount,
        contacts=contacts,
        coverage_items=coverage_items,
        details=details,
        raw_response=raw,
    )
