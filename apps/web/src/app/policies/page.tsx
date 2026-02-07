'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { policiesApi, renewalsApi, remindersApi, premiumsApi, sharingApi, documentsApi, Policy, PolicyCreate, RenewalItem, SmartAlert, SharedPolicy, PendingShare } from '../../../lib/api';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { APP_NAME } from '../config';

const POLICY_TYPES = ['auto', 'home', 'life', 'liability', 'umbrella', 'workers_comp', 'other'];

const POLICY_TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  auto: { icon: '🚗', label: 'Auto' },
  home: { icon: '🏠', label: 'Home' },
  life: { icon: '❤️', label: 'Life' },
  liability: { icon: '🛡️', label: 'Liability' },
  umbrella: { icon: '☂️', label: 'Umbrella' },
  workers_comp: { icon: '👷', label: 'Workers Comp' },
  other: { icon: '📋', label: 'Other' },
};

export default function PoliciesPage() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [renewals, setRenewals] = useState<RenewalItem[]>([]);
  const [annualSpend, setAnnualSpend] = useState<number>(0);
  const [sharedPolicies, setSharedPolicies] = useState<SharedPolicy[]>([]);
  const [pendingShares, setPendingShares] = useState<PendingShare[]>([]);
  const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const createFileRef = useRef<HTMLInputElement>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState<{ scope: string; policy_type: string }>({ scope: '', policy_type: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [extracting, setExtracting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    loadAll();
  }, [token]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [pols, rens, spend, shared, pending, alerts] = await Promise.all([
        policiesApi.list(),
        renewalsApi.upcoming(90),
        premiumsApi.annualSpend(),
        sharingApi.sharedWithMe(),
        sharingApi.pending(),
        remindersApi.smart().catch(() => []),
      ]);
      setPolicies(Array.isArray(pols) ? pols : []);
      setRenewals(Array.isArray(rens) ? rens : []);
      setAnnualSpend(spend.annual_spend_cents || 0);
      setSharedPolicies(Array.isArray(shared) ? shared : []);
      setPendingShares(Array.isArray(pending) ? pending : []);
      setSmartAlerts(Array.isArray(alerts) ? alerts : []);
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) { logout(); router.replace('/login'); return; }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    const file = createFileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    setError('');
    try {
      const newPolicy = await policiesApi.create({
        scope: (wizardData.scope || 'personal') as any,
        policy_type: wizardData.policy_type || 'other',
        carrier: 'Pending extraction...',
        policy_number: 'TBD',
        nickname: null, coverage_amount: null, deductible: null, renewal_date: null,
      });

      const document_id = await new Promise<number>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => {
          setUploadProgress(100);
          try {
            const res = JSON.parse(xhr.responseText);
            if (xhr.status >= 400) reject(new Error(res.detail || 'Upload failed'));
            else resolve(res.document_id);
          } catch { reject(new Error('Upload failed')); }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        const formData = new FormData();
        formData.append('file', file);
        formData.append('policy_id', String(newPolicy.id));
        formData.append('doc_type', 'policy');
        const tkn = localStorage.getItem('pv_token');
        xhr.open('POST', '/api/files/direct-upload');
        if (tkn) xhr.setRequestHeader('Authorization', `Bearer ${tkn}`);
        xhr.send(formData);
      });

      setUploading(false);
      setExtracting(true);

      try {
        const extractResult = await documentsApi.extract(document_id);
        sessionStorage.setItem(`pv_extract_${newPolicy.id}`, JSON.stringify({
          docId: extractResult.document_id,
          data: extractResult.extraction,
        }));
      } catch {}

      setExtracting(false);
      setShowAddModal(false);
      resetWizard();
      router.push(`/policies/${newPolicy.id}`);
    } catch (err: any) {
      setError(err.message);
      setUploading(false);
      setExtracting(false);
      setUploadProgress(null);
    }
  };

  const resetWizard = () => {
    setWizardStep(1);
    setWizardData({ scope: '', policy_type: '' });
    setUploading(false);
    setUploadProgress(null);
    setExtracting(false);
  };

  const handleDelete = async (id: number) => {
    try {
      await policiesApi.remove(id);
      setPolicies(prev => prev.filter(p => p.id !== id));
      setDeleteConfirm(null);
      toast('Policy deleted', 'success');
    } catch (err: any) { setError(err.message); }
  };

  const handleAcceptShare = async (shareId: number) => {
    try {
      await sharingApi.accept(shareId);
      loadAll();
    } catch (err: any) { setError(err.message); }
  };

  // Computed values for insights
  const activePolicies = policies.filter(p => p.carrier !== 'Pending extraction...');
  const nextRenewal = renewals.length > 0 ? renewals[0] : null;
  const daysToNextRenewal = nextRenewal ? Math.ceil((new Date(nextRenewal.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const urgentAlerts = smartAlerts.filter(a => a.severity === 'high');
  const typeCounts: Record<string, number> = {};
  activePolicies.forEach(p => { typeCounts[p.policy_type] = (typeCounts[p.policy_type] || 0) + 1; });

  // Search filter
  const q = search.toLowerCase().trim();
  const filteredPolicies = activePolicies.filter(p => {
    if (!q) return true;
    return (
      p.carrier.toLowerCase().includes(q) ||
      p.policy_number.toLowerCase().includes(q) ||
      p.policy_type.toLowerCase().includes(q) ||
      (p.nickname || '').toLowerCase().includes(q)
    );
  });

  if (!token) return null;

  // Determine system status
  const getSystemStatus = () => {
    if (urgentAlerts.length > 0) return { status: 'attention', message: `${urgentAlerts.length} item${urgentAlerts.length > 1 ? 's' : ''} need${urgentAlerts.length === 1 ? 's' : ''} attention`, color: 'var(--color-warning)' };
    if (activePolicies.length === 0) return { status: 'setup', message: 'Get started by adding your first policy', color: 'var(--color-text-muted)' };
    return { status: 'good', message: 'All policies active. No urgent actions.', color: 'var(--color-success)' };
  };

  const systemStatus = getSystemStatus();

  // Generate insights
  const insights: string[] = [];
  if (activePolicies.length > 0) {
    if (daysToNextRenewal !== null && daysToNextRenewal > 0) {
      insights.push(`Next renewal in ${daysToNextRenewal} days.`);
    } else if (daysToNextRenewal !== null && daysToNextRenewal <= 0) {
      insights.push(`A policy renewal is overdue.`);
    } else {
      insights.push(`No upcoming renewals.`);
    }
    Object.entries(typeCounts).forEach(([type, count]) => {
      insights.push(`You have ${count} active ${POLICY_TYPE_CONFIG[type]?.label.toLowerCase() || type} polic${count > 1 ? 'ies' : 'y'}.`);
    });
    if (annualSpend > 0) {
      insights.push(`Annual premium: $${(annualSpend / 100).toLocaleString()}.`);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
        <ConfirmDialog
          open={true}
          title="Delete Policy"
          message="Are you sure you want to delete this policy? This cannot be undone."
          danger={true}
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>

        {/* ═══════════════════════════════════════════════════════════════
            1️⃣ SYSTEM STATE - Status at a glance
        ═══════════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: 48 }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Insurance Overview</span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 12px', color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            {loading ? 'Loading...' : systemStatus.message}
          </h1>
          {!loading && daysToNextRenewal !== null && daysToNextRenewal > 0 && (
            <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', margin: 0 }}>
              Next renewal: <strong>{nextRenewal?.nickname || nextRenewal?.carrier}</strong> in {daysToNextRenewal} days
            </p>
          )}
        </section>

        {error && <div className="alert alert-error" style={{ marginBottom: 24 }}>{error}</div>}

        {/* Pending Shares Alert */}
        {pendingShares.length > 0 && (
          <div style={{ padding: 20, marginBottom: 24, backgroundColor: 'var(--color-info-bg)', border: '1px solid var(--color-info)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12, color: 'var(--color-text)' }}>Pending Shares</div>
            {pendingShares.map(s => (
              <div key={s.share_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{s.policy.nickname || s.policy.carrier} — {s.permission} access</span>
                <button onClick={() => handleAcceptShare(s.share_id)} className="btn btn-sm" style={{ padding: '6px 16px', fontSize: 13 }}>Accept</button>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            2️⃣ MEANING - Insights
        ═══════════════════════════════════════════════════════════════ */}
        {!loading && insights.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Insights</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {insights.slice(0, 4).map((insight, i) => (
                <p key={i} style={{ fontSize: 15, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>{insight}</p>
              ))}
            </div>
          </section>
        )}

        {/* Urgent Alerts */}
        {urgentAlerts.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Needs Attention</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {urgentAlerts.map((a, i) => (
                <div
                  key={i}
                  onClick={() => router.push(`/policies/${a.policy_id}`)}
                  style={{
                    padding: 16,
                    backgroundColor: 'var(--color-warning-bg)',
                    border: '1px solid var(--color-warning)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{a.description}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            3️⃣ ACTION - Primary actions (max 4)
        ═══════════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-accent"
              style={{ padding: '14px 28px', fontSize: 15, fontWeight: 600 }}
            >
              + Add Policy
            </button>
            <button
              onClick={() => router.push('/emergency')}
              className="btn btn-outline"
              style={{ padding: '14px 28px', fontSize: 15 }}
            >
              Emergency Access
            </button>
            {activePolicies.length >= 2 && (
              <button
                onClick={() => router.push('/policies/compare')}
                className="btn btn-outline"
                style={{ padding: '14px 28px', fontSize: 15 }}
              >
                Compare Coverage
              </button>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            4️⃣ DETAIL - Policy list (comes last)
        ═══════════════════════════════════════════════════════════════ */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Policies {activePolicies.length > 0 && `(${activePolicies.length})`}
            </h2>
            {activePolicies.length > 3 && (
              <input
                className="form-input"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: 200, padding: '8px 12px', fontSize: 14 }}
              />
            )}
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>
          ) : filteredPolicies.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', margin: 0 }}>
                {search ? 'No policies match your search.' : 'No policies yet. Add your first policy to get started.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredPolicies.map(p => (
                <div
                  key={p.id}
                  onClick={() => router.push(`/policies/${p.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '20px 24px',
                    backgroundColor: '#fff',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ fontSize: 28 }}>{POLICY_TYPE_CONFIG[p.policy_type]?.icon || '📋'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>
                        {p.nickname || p.carrier}
                      </span>
                      {/* Sharing Indicator */}
                      {p.shared_with && p.shared_with.length > 0 ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                        }}>
                          👥 Shared ({p.shared_with.length})
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          backgroundColor: '#f3f4f6',
                          color: '#6b7280',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 500,
                        }}>
                          🔒 Private
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {POLICY_TYPE_CONFIG[p.policy_type]?.label || p.policy_type} • {p.policy_number}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {p.renewal_date && (
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                        Renews {new Date(p.renewal_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(p.id); }}
                    style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 16 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Shared Policies */}
          {sharedPolicies.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                Shared With Me ({sharedPolicies.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sharedPolicies.map(s => (
                  <div
                    key={s.policy.id}
                    onClick={() => router.push(`/policies/${s.policy.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '16px 20px',
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 24 }}>{POLICY_TYPE_CONFIG[s.policy.policy_type]?.icon || '📋'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{s.policy.nickname || s.policy.carrier}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Shared with you • {s.permission} access</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ADD POLICY MODAL
      ═══════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', padding: 32, maxWidth: 500, width: '100%', maxHeight: '90vh', overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>Add Policy</h2>
              <button onClick={() => { setShowAddModal(false); resetWizard(); }} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--color-text-muted)' }}>×</button>
            </div>

            {/* Step 1: Scope */}
            {wizardStep === 1 && (
              <div>
                <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 20 }}>What type of policy is this?</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { value: 'personal', icon: '👤', label: 'Personal' },
                    { value: 'business', icon: '🏢', label: 'Business' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setWizardData(d => ({ ...d, scope: opt.value })); setWizardStep(2); }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 24,
                        border: '2px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff', cursor: 'pointer'
                      }}
                    >
                      <span style={{ fontSize: 32 }}>{opt.icon}</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Type */}
            {wizardStep === 2 && (
              <div>
                <button onClick={() => setWizardStep(1)} className="btn btn-ghost" style={{ marginBottom: 16, padding: '4px 8px', fontSize: 13 }}>← Back</button>
                <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 20 }}>What type of insurance?</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {Object.entries(POLICY_TYPE_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => { setWizardData(d => ({ ...d, policy_type: key })); setWizardStep(3); }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 16,
                        border: '2px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff', cursor: 'pointer'
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{cfg.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)' }}>{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Upload */}
            {wizardStep === 3 && (
              <div>
                <button onClick={() => setWizardStep(2)} disabled={uploading || extracting} className="btn btn-ghost" style={{ marginBottom: 16, padding: '4px 8px', fontSize: 13 }}>← Back</button>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: 'var(--color-text)' }}>Upload Policy Document</h3>
                  <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--color-text-secondary)' }}>
                    Upload a PDF and we&apos;ll extract the details automatically.
                  </p>
                  <input ref={createFileRef} type="file" accept=".pdf" style={{ marginBottom: 16 }} />
                  <div>
                    <button
                      onClick={handleUpload}
                      disabled={uploading || extracting}
                      className="btn btn-accent"
                      style={{ padding: '14px 32px', fontSize: 15, fontWeight: 600 }}
                    >
                      {extracting ? 'Extracting...' : uploading ? 'Uploading...' : 'Upload & Extract'}
                    </button>
                  </div>

                  {(uploading || extracting) && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                        {extracting ? 'Reading your policy...' : `Uploading... ${uploadProgress}%`}
                      </div>
                      <div style={{ height: 6, backgroundColor: 'var(--color-border)', borderRadius: 3 }}>
                        <div style={{
                          width: extracting ? '100%' : `${uploadProgress}%`,
                          height: '100%',
                          backgroundColor: 'var(--color-accent)',
                          borderRadius: 3,
                          transition: 'width 0.2s',
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
