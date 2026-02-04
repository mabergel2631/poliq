const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.trim() ||
  "https://poliq-production.up.railway.app";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pv_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = getToken();

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  const data = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    const message =
      (data && (data.detail || data.message)) ||
      `${res.status} ${res.statusText}`;
    const err: any = new Error(typeof message === "string" ? message : JSON.stringify(message));
    err.status = res.status;
    throw err;
  }

  return data as T;
}

function safeJsonParse(text: string) {
  try { return JSON.parse(text); } catch { return null; }
}

// ── Types ────────────────────────────────────────────

export type KeyContact = {
  name?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type Policy = {
  id: number;
  user_id: number;
  scope: "personal" | "business";
  policy_type: string;
  carrier: string;
  policy_number: string;
  nickname?: string | null;
  coverage_amount?: number | null;
  deductible?: number | null;
  premium_amount?: number | null;
  renewal_date?: string | null;
  created_at: string;
  key_contacts?: Record<string, KeyContact>;
  key_details?: Record<string, string>;
  shared_with?: string[];
};

export type PolicyCreate = {
  scope: "personal" | "business";
  policy_type: string;
  carrier: string;
  policy_number: string;
  nickname?: string | null;
  coverage_amount?: number | null;
  deductible?: number | null;
  premium_amount?: number | null;
  renewal_date?: string | null;
};

export type PolicyUpdate = Partial<PolicyCreate>;

export type Contact = {
  id: number;
  policy_id: number;
  role: string;
  name?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  created_at: string;
};

export type ContactCreate = {
  role: string;
  name?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
};

export type DocMeta = {
  id: number;
  policy_id: number;
  filename: string;
  content_type: string;
  object_key: string;
  doc_type: string;
  extraction_status: string;
  created_at: string;
};

// ── Auth API ─────────────────────────────────────────

export const authApi = {
  register(email: string, password: string) {
    return request<{ access_token: string; token_type: string }>("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  },
  login(email: string, password: string) {
    return request<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  },
};

// ── Policies API ─────────────────────────────────────

export const policiesApi = {
  list(): Promise<Policy[]> {
    return request<Policy[]>("/policies");
  },
  get(id: number): Promise<Policy> {
    return request<Policy>(`/policies/${id}`);
  },
  create(payload: PolicyCreate): Promise<Policy> {
    return request<Policy>("/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  update(id: number, payload: PolicyUpdate): Promise<Policy> {
    return request<Policy>(`/policies/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  remove(id: number): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/policies/${id}`, { method: "DELETE" });
  },
};

// ── Contacts API ─────────────────────────────────────

export const contactsApi = {
  list(policyId: number): Promise<Contact[]> {
    return request<Contact[]>(`/policies/${policyId}/contacts`);
  },
  create(policyId: number, payload: ContactCreate): Promise<Contact> {
    return request<Contact>(`/policies/${policyId}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  update(policyId: number, contactId: number, payload: Partial<ContactCreate>): Promise<Contact> {
    return request<Contact>(`/policies/${policyId}/contacts/${contactId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  remove(policyId: number, contactId: number): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/policies/${policyId}/contacts/${contactId}`, { method: "DELETE" });
  },
};

// ── Documents API ────────────────────────────────────

export const documentsApi = {
  list(policyId: number): Promise<DocMeta[]> {
    return request<DocMeta[]>(`/documents/by-policy/${policyId}`);
  },
  initUpload(policyId: number, filename: string, contentType: string, docType: string = "policy") {
    return request<{ upload_url: string; object_key: string }>("/documents/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policy_id: policyId, filename, content_type: contentType, doc_type: docType }),
    });
  },
  finalize(policyId: number, filename: string, contentType: string, objectKey: string, docType: string = "policy") {
    return request<{ ok: boolean; document_id: number }>("/documents/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policy_id: policyId, filename, content_type: contentType, object_key: objectKey, doc_type: docType }),
    });
  },
  extract(documentId: number) {
    return request<{ ok: boolean; document_id: number; extraction: ExtractionData }>(`/documents/${documentId}/extract`, {
      method: "POST",
    });
  },
  download(documentId: number) {
    return request<{ download_url: string }>(`/documents/${documentId}/download`);
  },
  confirmExtraction(documentId: number, data: ExtractionData) {
    return request<{ ok: boolean }>(`/documents/${documentId}/extract/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
};

export type ExtractedContact = {
  role: string;
  name?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type ExtractedCoverageItem = {
  item_type: string;
  description: string;
  limit?: string | null;
};

export type ExtractionData = {
  carrier?: string | null;
  policy_number?: string | null;
  policy_type?: string | null;
  scope?: string | null;
  coverage_amount?: number | null;
  deductible?: number | null;
  premium_amount?: number | null;
  renewal_date?: string | null;
  contacts: ExtractedContact[];
  coverage_items?: ExtractedCoverageItem[];
  details?: ExtractedDetail[];
};

export type ExtractedDetail = {
  field_name: string;
  field_value: string;
};

// ── Coverage Items API ──────────────────────────────

export type CoverageItem = {
  id: number;
  policy_id: number;
  item_type: string;
  description: string;
  limit?: string | null;
  created_at: string;
};

export type CoverageItemCreate = {
  item_type: string;
  description: string;
  limit?: string | null;
};

export const coverageApi = {
  list(policyId: number): Promise<CoverageItem[]> {
    return request<CoverageItem[]>(`/policies/${policyId}/coverage`);
  },
  create(policyId: number, payload: CoverageItemCreate): Promise<CoverageItem> {
    return request<CoverageItem>(`/policies/${policyId}/coverage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  remove(policyId: number, itemId: number): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/policies/${policyId}/coverage/${itemId}`, { method: "DELETE" });
  },
};

// ── Policy Details API ──────────────────────────────

export type PolicyDetail = {
  id: number;
  policy_id: number;
  field_name: string;
  field_value: string;
  created_at: string;
};

export type PolicyDetailCreate = {
  field_name: string;
  field_value: string;
};

export const policyDetailsApi = {
  list(policyId: number): Promise<PolicyDetail[]> {
    return request<PolicyDetail[]>(`/policies/${policyId}/details`);
  },
  create(policyId: number, payload: PolicyDetailCreate): Promise<PolicyDetail> {
    return request<PolicyDetail>(`/policies/${policyId}/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  update(policyId: number, detailId: number, payload: Partial<PolicyDetailCreate>): Promise<PolicyDetail> {
    return request<PolicyDetail>(`/policies/${policyId}/details/${detailId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  remove(policyId: number, detailId: number): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/policies/${policyId}/details/${detailId}`, { method: "DELETE" });
  },
};

// ── Renewals API ────────────────────────────────────

export type RenewalItem = {
  id: number;
  carrier: string;
  policy_type: string;
  policy_number: string;
  nickname?: string | null;
  renewal_date: string;
  coverage_amount?: number | null;
};

export const renewalsApi = {
  upcoming(days: number = 30): Promise<RenewalItem[]> {
    return request<RenewalItem[]>(`/renewals/upcoming?days=${days}`);
  },
};

// ── Premiums API ────────────────────────────────────

export type Premium = {
  id: number;
  policy_id: number;
  amount: number; // cents
  frequency: string;
  due_date: string;
  paid_date?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  created_at: string;
};

export type PremiumCreate = {
  amount: number;
  frequency: string;
  due_date: string;
  paid_date?: string | null;
  payment_method?: string | null;
  notes?: string | null;
};

export const premiumsApi = {
  list(policyId: number): Promise<Premium[]> {
    return request<Premium[]>(`/policies/${policyId}/premiums`);
  },
  create(policyId: number, payload: PremiumCreate): Promise<Premium> {
    return request<Premium>(`/policies/${policyId}/premiums`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  update(policyId: number, premiumId: number, payload: Partial<PremiumCreate>): Promise<Premium> {
    return request<Premium>(`/policies/${policyId}/premiums/${premiumId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  remove(policyId: number, premiumId: number): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/policies/${policyId}/premiums/${premiumId}`, { method: "DELETE" });
  },
  annualSpend(): Promise<{ annual_spend_cents: number }> {
    return request<{ annual_spend_cents: number }>("/premiums/annual-spend");
  },
};

// ── Claims API ──────────────────────────────────────

export type Claim = {
  id: number;
  policy_id: number;
  claim_number: string;
  status: string;
  date_filed: string;
  date_resolved?: string | null;
  amount_claimed?: number | null;
  amount_paid?: number | null;
  description: string;
  notes?: string | null;
  created_at: string;
};

export type ClaimCreate = {
  claim_number: string;
  status: string;
  date_filed: string;
  description: string;
  date_resolved?: string | null;
  amount_claimed?: number | null;
  amount_paid?: number | null;
  notes?: string | null;
};

export const claimsApi = {
  list(policyId: number): Promise<Claim[]> {
    return request<Claim[]>(`/policies/${policyId}/claims`);
  },
  create(policyId: number, payload: ClaimCreate): Promise<Claim> {
    return request<Claim>(`/policies/${policyId}/claims`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  update(policyId: number, claimId: number, payload: Partial<ClaimCreate>): Promise<Claim> {
    return request<Claim>(`/policies/${policyId}/claims/${claimId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  remove(policyId: number, claimId: number): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/policies/${policyId}/claims/${claimId}`, { method: "DELETE" });
  },
};

// ── Reminders API ───────────────────────────────────

export type RenewalReminder = {
  id: number;
  policy_id: number;
  remind_at: string;
  dismissed: boolean;
  carrier?: string | null;
  policy_type?: string | null;
  nickname?: string | null;
  renewal_date?: string | null;
  created_at: string;
};

export type SmartAlert = {
  type: string;
  severity: string;
  policy_id: number;
  title: string;
  description: string;
  action: string;
};

export const remindersApi = {
  active(): Promise<RenewalReminder[]> {
    return request<RenewalReminder[]>("/reminders/active");
  },
  smart(): Promise<SmartAlert[]> {
    return request<SmartAlert[]>("/reminders/smart");
  },
  dismiss(reminderId: number): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/reminders/${reminderId}/dismiss`, { method: "PUT" });
  },
};

// ── Audit API ───────────────────────────────────────

export type AuditLogEntry = {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  details?: string | null;
  created_at: string;
};

export type AuditLogPage = {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
};

export const auditApi = {
  list(page: number = 1, limit: number = 20): Promise<AuditLogPage> {
    return request<AuditLogPage>(`/audit?page=${page}&limit=${limit}`);
  },
};

// ── Sharing API ─────────────────────────────────────

export type PolicyShareType = {
  id: number;
  policy_id: number;
  owner_id: number;
  shared_with_email: string;
  permission: string;
  role_label?: string | null;
  expires_at?: string | null;
  accepted: boolean;
  created_at: string;
};

export type ShareCreate = {
  shared_with_email: string;
  permission: string;
  role_label?: string | null;
  expires_at?: string | null;
};

export type SharedPolicy = {
  share_id: number;
  permission: string;
  policy: Policy;
};

export type PendingShare = {
  share_id: number;
  permission: string;
  owner_id: number;
  policy: { id: number; carrier: string; policy_type: string; nickname?: string | null };
};

export const sharingApi = {
  share(policyId: number, payload: ShareCreate): Promise<PolicyShareType> {
    return request<PolicyShareType>(`/policies/${policyId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  listShares(policyId: number): Promise<PolicyShareType[]> {
    return request<PolicyShareType[]>(`/policies/${policyId}/shares`);
  },
  sharedWithMe(): Promise<SharedPolicy[]> {
    return request<SharedPolicy[]>("/policies/shared-with-me");
  },
  pending(): Promise<PendingShare[]> {
    return request<PendingShare[]>("/shares/pending");
  },
  accept(shareId: number): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/shares/${shareId}/accept`, { method: "PUT" });
  },
  revoke(shareId: number): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/shares/${shareId}`, { method: "DELETE" });
  },
};

// ── Compare API ─────────────────────────────────────

export type PolicyBundle = {
  policy: { id: number; scope: string; policy_type: string; carrier: string; policy_number: string; nickname?: string | null; coverage_amount?: number | null; deductible?: number | null; renewal_date?: string | null };
  contacts: { id: number; role: string; name?: string | null; company?: string | null; phone?: string | null; email?: string | null }[];
  coverage_items: { id: number; item_type: string; description: string; limit?: string | null }[];
  details: { id: number; field_name: string; field_value: string }[];
  premiums: { id: number; amount: number; frequency: string; due_date: string; paid_date?: string | null }[];
};

export const compareApi = {
  compare(ids: number[]): Promise<PolicyBundle[]> {
    return request<PolicyBundle[]>(`/policies/compare?ids=${ids.join(",")}`);
  },
};

// ── Export API ───────────────────────────────────────

async function downloadFile(path: string, filename: string) {
  const url = `${API_BASE}${path}`;
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const exportApi = {
  allPolicies() { return downloadFile("/export/policies", "policies.csv"); },
  singlePolicy(policyId: number) { return downloadFile(`/export/policies/${policyId}`, `policy_${policyId}.csv`); },
};
