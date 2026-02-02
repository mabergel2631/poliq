'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { PolicyListSkeleton, TableRowSkeleton } from '../components/Skeleton';
import { policiesApi, renewalsApi, remindersApi, premiumsApi, sharingApi, exportApi, documentsApi, Policy, PolicyCreate, RenewalItem, RenewalReminder, SmartAlert, SharedPolicy, PendingShare, ExtractionData } from '../../../lib/api';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const POLICY_TYPES = ['auto', 'home', 'life', 'liability', 'umbrella', 'workers_comp', 'other'];

const POLICY_TYPE_CONFIG: Record<string, { icon: string; label: string; desc: string }> = {
  auto: { icon: '🚗', label: 'Auto', desc: 'Vehicle insurance' },
  home: { icon: '🏠', label: 'Home', desc: 'Property coverage' },
  life: { icon: '❤️', label: 'Life', desc: 'Life insurance' },
  liability: { icon: '🛡️', label: 'Liability', desc: 'General liability' },
  umbrella: { icon: '☂️', label: 'Umbrella', desc: 'Extra coverage' },
  workers_comp: { icon: '👷', label: 'Workers Comp', desc: 'Employee coverage' },
  other: { icon: '📋', label: 'Other', desc: 'Other policy type' },
};

const WIZARD_STEPS = ['Scope', 'Type', 'Method', 'Details'] as const;

export default function PoliciesPage() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [renewals, setRenewals] = useState<RenewalItem[]>([]);
  const [reminders, setReminders] = useState<RenewalReminder[]>([]);
  const [annualSpend, setAnnualSpend] = useState<number>(0);
  const [sharedPolicies, setSharedPolicies] = useState<SharedPolicy[]>([]);
  const [pendingShares, setPendingShares] = useState<PendingShare[]>([]);
  const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'mine' | 'shared'>('mine');
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCards, setShowCards] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [filterScope, setFilterScope] = useState('');
  const createFileRef = useRef<HTMLInputElement>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState<{ scope: string; policy_type: string }>({ scope: '', policy_type: '' });
  const [transitioning, setTransitioning] = useState(false);
  const [createUploading, setCreateUploading] = useState(false);
  const [createProgress, setCreateProgress] = useState<number | null>(null);
  const [createExtracting, setCreateExtracting] = useState(false);
  const [createFileName, setCreateFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const goToStep = (step: number) => {
    setTransitioning(true);
    setTimeout(() => {
      setWizardStep(step);
      setTransitioning(false);
    }, 150);
  };

  const resetWizard = () => {
    setWizardStep(1);
    setWizardData({ scope: '', policy_type: '' });
    setTransitioning(false);
    setCreateUploading(false);
    setCreateProgress(null);
    setCreateExtracting(false);
    setCreateFileName(null);
    setForm({ scope: 'personal', policy_type: 'auto', carrier: '', policy_number: '', nickname: '', coverage_amount: null, deductible: null, renewal_date: null });
  };

  const [form, setForm] = useState<PolicyCreate>({
    scope: 'personal',
    policy_type: 'auto',
    carrier: '',
    policy_number: '',
    nickname: '',
    coverage_amount: null,
    deductible: null,
    renewal_date: null,
  });

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    loadAll();
  }, [token]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [pols, rens, rems, spend, shared, pending, alerts] = await Promise.all([
        policiesApi.list(),
        renewalsApi.upcoming(30),
        remindersApi.active(),
        premiumsApi.annualSpend(),
        sharingApi.sharedWithMe(),
        sharingApi.pending(),
        remindersApi.smart().catch(() => []),
      ]);
      setPolicies(Array.isArray(pols) ? pols : []);
      setRenewals(Array.isArray(rens) ? rens : []);
      setReminders(Array.isArray(rems) ? rems : []);
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

  const handleUploadFirstWizard = async () => {
    const file = createFileRef.current?.files?.[0];
    if (!file) return;
    setCreateUploading(true);
    setCreateProgress(0);
    setCreateFileName(file.name);
    setError('');
    try {
      const newPolicy = await policiesApi.create({
        scope: (wizardData.scope || 'personal') as any, policy_type: wizardData.policy_type || 'other', carrier: 'Pending extraction...', policy_number: 'TBD',
        nickname: null, coverage_amount: null, deductible: null, renewal_date: null,
      });

      // Upload with progress
      const document_id = await new Promise<number>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setCreateProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => {
          setCreateProgress(100);
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

      setCreateUploading(false);
      setCreateExtracting(true);

      // Auto-extract and store result for the detail page
      try {
        const extractResult = await documentsApi.extract(document_id);
        sessionStorage.setItem(`pv_extract_${newPolicy.id}`, JSON.stringify({
          docId: extractResult.document_id,
          data: extractResult.extraction,
        }));
      } catch {
        // Extraction may fail (no API key, etc.) — still redirect
      }

      setCreateExtracting(false);
      setShowForm(false);
      resetWizard();
      router.push(`/policies/${newPolicy.id}`);
    } catch (err: any) {
      setError(err.message);
      setCreateUploading(false);
      setCreateExtracting(false);
      setCreateProgress(null);
    }
  };

  const handleCreateWizard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const newPolicy = await policiesApi.create({
        ...form,
        scope: (wizardData.scope || form.scope) as any,
        policy_type: wizardData.policy_type || form.policy_type,
        nickname: form.nickname || null,
      });
      setShowForm(false);
      resetWizard();
      router.push(`/policies/${newPolicy.id}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await policiesApi.remove(id);
      setPolicies(prev => prev.filter(p => p.id !== id));
      setDeleteConfirm(null);
      toast('Policy deleted', 'success');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDismiss = async (reminderId: number) => {
    try {
      await remindersApi.dismiss(reminderId);
      setReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (err: any) { setError(err.message); }
  };

  const handleAcceptShare = async (shareId: number) => {
    try {
      await sharingApi.accept(shareId);
      loadAll();
    } catch (err: any) { setError(err.message); }
  };

  const toggleCompare = (id: number) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Dashboard stats
  const typeCounts: Record<string, number> = {};
  policies.forEach(p => { typeCounts[p.policy_type] = (typeCounts[p.policy_type] || 0) + 1; });

  // Search + filter
  const q = search.toLowerCase().trim();
  const filtered = policies.filter(p => {
    if (filterType && p.policy_type !== filterType) return false;
    if (filterScope && p.scope !== filterScope) return false;
    if (!q) return true;
    const kc = p.key_contacts || {};
    const det = p.key_details || {};
    const contactStr = Object.values(kc).map(c => `${c.name || ''} ${c.phone || ''}`).join(' ').toLowerCase();
    const detailStr = Object.values(det).join(' ').toLowerCase();
    return (
      p.carrier.toLowerCase().includes(q) ||
      p.policy_number.toLowerCase().includes(q) ||
      p.policy_type.toLowerCase().includes(q) ||
      (p.nickname || '').toLowerCase().includes(q) ||
      contactStr.includes(q) ||
      detailStr.includes(q)
    );
  });

  if (!token) return null;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>My Policies</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>Manage your insurance portfolio</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => exportApi.allPolicies()} className="btn btn-outline">Export CSV</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Renewal Reminders Banner */}
      {reminders.length > 0 && (
        <div className="alert alert-warning">
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Renewal Reminders</div>
          {reminders.map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 13 }}>{r.nickname || r.carrier} ({r.policy_type}) — renews {r.renewal_date}</span>
              <button onClick={() => handleDismiss(r.id)} className="btn btn-ghost" style={{ fontSize: 12, textDecoration: 'underline' }}>Dismiss</button>
            </div>
          ))}
        </div>
      )}

      {/* Pending Shares Banner */}
      {pendingShares.length > 0 && (
        <div style={{ padding: 16, marginBottom: 16, backgroundColor: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: '#1e40af' }}>Pending Shares</div>
          {pendingShares.map(s => (
            <div key={s.share_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: '#1e3a8a' }}>{s.policy.nickname || s.policy.carrier} ({s.policy.policy_type}) — {s.permission} access</span>
              <button onClick={() => handleAcceptShare(s.share_id)} style={{ padding: '4px 12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Accept</button>
            </div>
          ))}
        </div>
      )}

      {/* Smart Alerts */}
      {smartAlerts.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: 'var(--color-text)' }}>Action Items</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {smartAlerts.map((a, i) => {
              const colors = { high: { bg: 'var(--color-danger-bg)', border: '#fecaca', dot: 'var(--color-danger)' }, medium: { bg: 'var(--color-warning-bg)', border: '#fde68a', dot: 'var(--color-warning)' }, low: { bg: 'var(--color-info-bg)', border: '#bfdbfe', dot: 'var(--color-info)' } };
              const c = colors[a.severity as keyof typeof colors] || colors.low;
              return (
                <div key={i} onClick={() => router.push(`/policies/${a.policy_id}`)} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 12px', backgroundColor: c.bg, border: `1px solid ${c.border}`, borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: c.dot, marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{a.description}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{a.action}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dashboard Cards */}
      <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Upcoming Renewals (30d)</div>
          {renewals.length === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>None upcoming</div>
          ) : (
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: 'var(--color-primary)' }}>{renewals.length}</div>
              {renewals.slice(0, 3).map(r => (
                <div key={r.id} style={{ fontSize: 13, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text)' }}>{r.nickname || r.carrier}</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{r.renewal_date}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Policies by Type</div>
          {Object.entries(typeCounts).length === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>No policies</div>
          ) : (
            <div>
              {(() => { const maxCount = Math.max(...Object.values(typeCounts)); return Object.entries(typeCounts).map(([type, count]) => (
                <div key={type} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{type}</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{count}</span>
                  </div>
                  <div style={{ height: 6, backgroundColor: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / maxCount) * 100}%`, backgroundColor: 'var(--color-accent)', borderRadius: 3, transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              )); })()}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Annual Insurance Spend</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-primary)' }}>{annualSpend ? `$${(annualSpend / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>Based on premium records</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid var(--color-border)' }}>
        <button onClick={() => setTab('mine')} style={{ padding: '10px 20px', backgroundColor: 'transparent', color: tab === 'mine' ? 'var(--color-primary)' : 'var(--color-text-muted)', border: 'none', borderBottom: tab === 'mine' ? '2px solid var(--color-primary)' : '2px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: -2 }}>My Policies</button>
        <button onClick={() => setTab('shared')} style={{ padding: '10px 20px', backgroundColor: 'transparent', color: tab === 'shared' ? 'var(--color-primary)' : 'var(--color-text-muted)', border: 'none', borderBottom: tab === 'shared' ? '2px solid var(--color-primary)' : '2px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: -2 }}>Shared With Me {sharedPolicies.length > 0 && `(${sharedPolicies.length})`}</button>
      </div>

      {tab === 'mine' && (
        <>
          {/* Search + Add + Compare */}
          <div className="search-toolbar" style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
            <input className="form-input" placeholder="Search by carrier, policy #, type, nickname, contact..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
            <button onClick={() => setShowFilters(!showFilters)} className="btn btn-outline">
              {showFilters ? 'Hide Filters' : 'Filters'}
              {(filterType || filterScope) ? ' *' : ''}
            </button>
            {compareIds.length >= 1 && (
              <button onClick={() => setShowCards(!showCards)} className="btn btn-outline">
                {showCards ? 'Hide Cards' : `View Cards (${compareIds.length})`}
              </button>
            )}
            {compareIds.length >= 2 && (
              <button onClick={() => router.push(`/policies/compare?ids=${compareIds.join(',')}`)} className="btn" style={{ backgroundColor: '#6d28d9', color: '#fff' }}>Compare ({compareIds.length})</button>
            )}
            <button onClick={() => { if (showForm) resetWizard(); setShowForm(!showForm); }} className="btn btn-accent">{showForm ? 'Cancel' : '+ Add Policy'}</button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', padding: 12, backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Type</label>
                <select className="form-input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 140, padding: '6px 8px', fontSize: 13 }}>
                  <option value="">All types</option>
                  {POLICY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Scope</label>
                <select className="form-input" value={filterScope} onChange={e => setFilterScope(e.target.value)} style={{ width: 140, padding: '6px 8px', fontSize: 13 }}>
                  <option value="">All scopes</option>
                  <option value="personal">Personal</option>
                  <option value="business">Business</option>
                </select>
              </div>
              {(filterType || filterScope) && (
                <button onClick={() => { setFilterType(''); setFilterScope(''); }} className="btn btn-ghost" style={{ alignSelf: 'flex-end', fontSize: 12 }}>Clear filters</button>
              )}
            </div>
          )}

          {/* Create Policy Wizard */}
          {showForm && (
            <div className="card" style={{ marginBottom: 24, opacity: transitioning ? 0 : 1, transition: 'opacity 150ms ease' }}>
              {/* Progress indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 28 }}>
                {WIZARD_STEPS.map((label, i) => {
                  const stepNum = i + 1;
                  const isCompleted = wizardStep > stepNum;
                  const isCurrent = wizardStep === stepNum;
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                          backgroundColor: isCompleted ? 'var(--color-accent)' : isCurrent ? 'var(--color-primary)' : 'transparent',
                          color: isCompleted || isCurrent ? '#fff' : 'var(--color-text-muted)',
                          border: isCompleted || isCurrent ? 'none' : '2px solid var(--color-border)',
                        }}>
                          {isCompleted ? '✓' : stepNum}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: isCurrent ? 'var(--color-primary)' : 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</span>
                      </div>
                      {i < WIZARD_STEPS.length - 1 && (
                        <div className="wizard-connector" style={{ width: 48, height: 2, backgroundColor: isCompleted ? 'var(--color-accent)' : 'var(--color-border)', margin: '0 8px', marginBottom: 18 }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Back button */}
              {wizardStep > 1 && (
                <button
                  onClick={() => goToStep(wizardStep - 1)}
                  disabled={createUploading || createExtracting}
                  className="btn btn-ghost"
                  style={{ fontSize: 13, marginBottom: 12, padding: '4px 8px' }}
                >
                  ← Back
                </button>
              )}

              {/* Step 1: Scope */}
              {wizardStep === 1 && (
                <div>
                  <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', textAlign: 'center' }}>What type of policy is this?</h3>
                  <div className="wizard-scope-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 480, margin: '0 auto' }}>
                    {[
                      { value: 'personal', icon: '👤', label: 'Personal', desc: 'Individual or family coverage' },
                      { value: 'business', icon: '🏢', label: 'Business', desc: 'Commercial or business coverage' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setWizardData(d => ({ ...d, scope: opt.value })); goToStep(2); }}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 16px',
                          border: '2px solid var(--color-border)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg)',
                          cursor: 'pointer', transition: 'all 150ms ease', fontSize: 14,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <span style={{ fontSize: 36 }}>{opt.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text)' }}>{opt.label}</span>
                        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Policy Type */}
              {wizardStep === 2 && (
                <div>
                  <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', textAlign: 'center' }}>
                    What type of {wizardData.scope} insurance?
                  </h3>
                  <div className="wizard-type-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                    {Object.entries(POLICY_TYPE_CONFIG).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => { setWizardData(d => ({ ...d, policy_type: key })); goToStep(3); }}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '20px 12px', minHeight: 44,
                          border: '2px solid var(--color-border)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg)',
                          cursor: 'pointer', transition: 'all 150ms ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <span style={{ fontSize: 28 }}>{cfg.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>{cfg.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', textAlign: 'center' }}>{cfg.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Method */}
              {wizardStep === 3 && (
                <div>
                  <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', textAlign: 'center' }}>How would you like to add this policy?</h3>

                  {/* Upload PDF option */}
                  <div style={{ padding: '24px', border: '2px solid var(--color-accent)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg)', marginBottom: 16, position: 'relative' }}>
                    <span style={{ position: 'absolute', top: -10, right: 16, fontSize: 11, fontWeight: 700, color: '#fff', backgroundColor: 'var(--color-accent)', padding: '2px 10px', borderRadius: 10 }}>Recommended</span>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                      <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>Upload PDF</h4>
                      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        Upload a declarations page or full policy document. AI will extract details automatically.
                      </p>
                      <input ref={createFileRef} type="file" accept=".pdf" style={{ fontSize: 14, marginBottom: 12 }} />
                      <div>
                        <button
                          onClick={handleUploadFirstWizard}
                          disabled={createUploading || createExtracting}
                          className="btn btn-accent"
                          style={{ padding: '12px 32px', fontSize: 15, fontWeight: 600 }}
                        >
                          {createExtracting ? 'Extracting policy data...' : createUploading ? 'Uploading...' : 'Upload & Extract'}
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {(createUploading || createExtracting) && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                          <span>{createExtracting ? 'AI is reading your policy...' : `Uploading ${createFileName || 'document'}...`}</span>
                          {createProgress !== null && !createExtracting && <span>{createProgress}%</span>}
                        </div>
                        <div style={{ backgroundColor: 'var(--color-border)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                          <div style={{
                            width: createExtracting ? '100%' : `${createProgress || 0}%`,
                            height: '100%',
                            backgroundColor: createExtracting ? 'var(--color-accent)' : 'var(--color-primary)',
                            borderRadius: 4,
                            transition: 'width 0.2s',
                            animation: createExtracting ? 'skeleton-pulse 1.5s ease-in-out infinite' : 'none',
                          }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* OR divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
                    <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border)' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>OR</span>
                    <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border)' }} />
                  </div>

                  {/* Manual option */}
                  <div style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => goToStep(4)}
                      disabled={createUploading || createExtracting}
                      className="btn btn-outline"
                      style={{ padding: '12px 32px', fontSize: 14 }}
                    >
                      Enter Manually
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Manual Fields */}
              {wizardStep === 4 && (
                <div>
                  <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', textAlign: 'center' }}>Enter Policy Details</h3>

                  {/* Summary box */}
                  <div style={{ display: 'flex', gap: 16, padding: '12px 16px', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', marginBottom: 20, fontSize: 13 }}>
                    <div><span style={{ color: 'var(--color-text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Scope:</span> <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{wizardData.scope}</span></div>
                    <div><span style={{ color: 'var(--color-text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Type:</span> <span style={{ fontWeight: 600 }}>{POLICY_TYPE_CONFIG[wizardData.policy_type]?.label || wizardData.policy_type}</span></div>
                  </div>

                  <form onSubmit={handleCreateWizard}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520, margin: '0 auto' }}>
                      <div><label className="form-label">Carrier *</label><input className="form-input" value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })} required /></div>
                      <div><label className="form-label">Policy Number *</label><input className="form-input" value={form.policy_number} onChange={e => setForm({ ...form, policy_number: e.target.value })} required /></div>
                      <div><label className="form-label">Nickname</label><input className="form-input" value={form.nickname ?? ''} onChange={e => setForm({ ...form, nickname: e.target.value })} placeholder="e.g. Mom's Car, Lake House" /></div>
                      <div className="wizard-side-by-side" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div><label className="form-label">Coverage Amount</label><input className="form-input" type="number" value={form.coverage_amount ?? ''} onChange={e => setForm({ ...form, coverage_amount: e.target.value ? Number(e.target.value) : null })} /></div>
                        <div><label className="form-label">Deductible</label><input className="form-input" type="number" value={form.deductible ?? ''} onChange={e => setForm({ ...form, deductible: e.target.value ? Number(e.target.value) : null })} /></div>
                      </div>
                      <div><label className="form-label">Renewal Date</label><input className="form-input" type="date" value={form.renewal_date ?? ''} onChange={e => setForm({ ...form, renewal_date: e.target.value || null })} /></div>
                      <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 15, fontWeight: 600, width: '100%' }}>Create Policy</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Policy List */}
          {loading ? <PolicyListSkeleton /> : filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{search ? '🔍' : '📋'}</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
                {search ? 'No matches found' : 'No policies yet'}
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>
                {search ? 'Try adjusting your search or filters.' : 'Add your first policy using the form above to get started.'}
              </p>
            </div>
          ) : (
            <>
            {/* Selected policy cards */}
            {showCards && compareIds.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>Insurance ID Cards</h3>
                  <button onClick={() => setShowCards(false)} className="btn btn-ghost" style={{ fontSize: 12 }}>Close</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                  {filtered.filter(p => compareIds.includes(p.id)).map(p => {
                    const kc = p.key_contacts || {};
                    const det = p.key_details || {};
                    const claimsPhone = kc.claims?.phone || kc.customer_service?.phone;
                    return (
                      <div key={p.id} className="card" style={{ cursor: 'pointer', transition: 'box-shadow 0.15s ease', padding: 0, overflow: 'hidden' }} onClick={() => router.push(`/policies/${p.id}`)}>
                        {/* Card header */}
                        <div style={{ padding: '16px 20px', backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 16 }}>{p.carrier}</div>
                              {p.nickname && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{p.nickname}</div>}
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)' }}>{p.policy_type}</span>
                          </div>
                        </div>

                        {/* Card body */}
                        <div style={{ padding: '12px 20px' }}>
                          {/* Core fields */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, marginBottom: 12 }}>
                            <div>
                              <div style={{ color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Policy #</div>
                              <div style={{ fontFamily: 'monospace', fontWeight: 500 }}>{p.policy_number}</div>
                            </div>
                            {det.effective_date && (
                              <div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Effective</div>
                                <div>{det.effective_date}</div>
                              </div>
                            )}
                            <div>
                              <div style={{ color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Expiration</div>
                              <div>{p.renewal_date ?? '-'}</div>
                            </div>
                          </div>

                          {/* Insured name */}
                          {det.named_insured && (
                            <div style={{ fontSize: 13, marginBottom: 8 }}>
                              <span style={{ color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Insured: </span>
                              <span style={{ fontWeight: 500 }}>{det.named_insured}</span>
                            </div>
                          )}

                          {/* Auto-specific: vehicles & drivers */}
                          {p.policy_type === 'auto' && (() => {
                            const vehicles: { desc: string; vin?: string }[] = [];
                            // Numbered vehicles: vehicle_1_description, vehicle_2_description, ...
                            for (let i = 1; i <= 10; i++) {
                              const d = det[`vehicle_${i}_description`];
                              if (d) vehicles.push({ desc: d, vin: det[`vehicle_${i}_VIN`] });
                            }
                            // Legacy single vehicle fields
                            if (vehicles.length === 0 && (det.vehicle_description || det.year || det.make || det.model)) {
                              vehicles.push({ desc: det.vehicle_description || [det.year, det.make, det.model].filter(Boolean).join(' '), vin: det.VIN });
                            }
                            const drivers = det.listed_drivers;
                            if (vehicles.length === 0 && !drivers) return null;
                            return (
                              <div style={{ fontSize: 12, padding: '8px 10px', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                                {vehicles.length > 0 && (
                                  <>
                                    <div style={{ color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{vehicles.length > 1 ? 'Vehicles' : 'Vehicle'}</div>
                                    {vehicles.map((v, i) => (
                                      <div key={i} style={{ marginBottom: i < vehicles.length - 1 ? 4 : 0 }}>
                                        <div style={{ fontWeight: 500, fontSize: 13 }}>{v.desc}</div>
                                        {v.vin && <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-secondary)' }}>VIN: {v.vin}</div>}
                                      </div>
                                    ))}
                                  </>
                                )}
                                {drivers && (
                                  <div style={{ marginTop: vehicles.length > 0 ? 6 : 0 }}>
                                    <div style={{ color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Listed Drivers</div>
                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{drivers}</div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Home-specific: property address */}
                          {p.policy_type === 'home' && det.property_address && (
                            <div style={{ fontSize: 12, padding: '8px 10px', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                              <div style={{ color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Property</div>
                              <div style={{ fontWeight: 500, fontSize: 13 }}>{det.property_address}</div>
                            </div>
                          )}

                          {/* Life-specific */}
                          {p.policy_type === 'life' && (det.beneficiary || det.face_value || det.term_length || det.cash_value || det.policy_subtype) && (
                            <div style={{ fontSize: 12, padding: '8px 10px', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                              <div style={{ color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Life Policy Details</div>
                              {det.policy_subtype && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 2 }}>{det.policy_subtype}</div>}
                              {det.beneficiary && <div style={{ fontWeight: 500, fontSize: 13 }}>Beneficiary: {det.beneficiary}</div>}
                              {det.face_value && <div style={{ fontSize: 12, marginTop: 2 }}>Face Value: {det.face_value}</div>}
                              {det.term_length && <div style={{ fontSize: 12, marginTop: 2 }}>Term: {det.term_length}</div>}
                              {det.cash_value && <div style={{ fontSize: 12, marginTop: 2 }}>Cash Value: {det.cash_value}</div>}
                            </div>
                          )}

                          {/* Liability / Umbrella-specific */}
                          {(p.policy_type === 'liability' || p.policy_type === 'umbrella') && (det.aggregate_limit || det.per_occurrence_limit || det.underlying_policies) && (
                            <div style={{ fontSize: 12, padding: '8px 10px', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                              <div style={{ color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{p.policy_type === 'umbrella' ? 'Umbrella' : 'Liability'} Details</div>
                              {det.per_occurrence_limit && <div style={{ fontWeight: 500, fontSize: 13 }}>Per Occurrence: {det.per_occurrence_limit}</div>}
                              {det.aggregate_limit && <div style={{ fontSize: 12, marginTop: 2 }}>Aggregate: {det.aggregate_limit}</div>}
                              {det.underlying_policies && <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-secondary)' }}>Underlying: {det.underlying_policies}</div>}
                            </div>
                          )}

                          {/* Workers Comp-specific */}
                          {p.policy_type === 'workers_comp' && (det.business_name || det.classification_code || det.state || det.employer_liability_limit) && (
                            <div style={{ fontSize: 12, padding: '8px 10px', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                              <div style={{ color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Workers Comp Details</div>
                              {det.business_name && <div style={{ fontWeight: 500, fontSize: 13 }}>{det.business_name}</div>}
                              {det.classification_code && <div style={{ fontSize: 12, marginTop: 2 }}>Class Code: {det.classification_code}</div>}
                              {det.state && <div style={{ fontSize: 12, marginTop: 2 }}>State: {det.state}</div>}
                              {det.employer_liability_limit && <div style={{ fontSize: 12, marginTop: 2 }}>Employer Liability: {det.employer_liability_limit}</div>}
                            </div>
                          )}

                          {/* Claims phone */}
                          {claimsPhone && (
                            <div style={{ fontSize: 12, marginBottom: 8 }}>
                              <span style={{ color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Claims: </span>
                              <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>{claimsPhone}</span>
                            </div>
                          )}

                          {/* Shared with */}
                          <div style={{ fontSize: 12 }}>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Shared with: </span>
                            <span style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                              {p.shared_with && p.shared_with.length > 0 ? p.shared_with.join(', ') : 'None'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Policy table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>Policy</th>
                  <th>Type</th>
                  <th>Policy #</th>
                  <th>Premium</th>
                  <th>Renewal</th>
                  <th>Claims Contact</th>
                  <th>Broker</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const kc = p.key_contacts || {};
                  return (
                  <tr key={p.id} style={{ cursor: 'pointer', backgroundColor: compareIds.includes(p.id) ? 'var(--color-info-bg)' : undefined }} onClick={() => router.push(`/policies/${p.id}`)}>
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={compareIds.includes(p.id)} onChange={() => toggleCompare(p.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.nickname || p.carrier}</div>
                        {p.nickname && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{p.carrier}</div>}
                        <span className={`badge badge-${p.scope}`}>{p.scope}</span>
                      </div>
                    </td>
                    <td>{p.policy_type}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{p.policy_number}</td>
                    <td style={{ fontWeight: 500 }}>{p.premium_amount ? `$${p.premium_amount.toLocaleString()}` : '-'}</td>
                    <td>{p.renewal_date ?? '-'}</td>
                    <td>{kc.claims ? <div><div style={{ fontSize: 13 }}>{kc.claims.name || kc.claims.company || '-'}</div>{kc.claims.phone && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{kc.claims.phone}</div>}</div> : '-'}</td>
                    <td>{kc.broker ? <div><div style={{ fontSize: 13 }}>{kc.broker.name || kc.broker.company || '-'}</div>{kc.broker.phone && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{kc.broker.phone}</div>}</div> : '-'}</td>
                    <td>
                      <button onClick={e => { e.stopPropagation(); setDeleteConfirm(p.id); }} className="btn btn-danger">Delete</button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            </div>
            </>
          )}
        </>
      )}

      {tab === 'shared' && (
        <div>
          {sharedPolicies.length === 0 ? (
            <p style={{ color: '#666' }}>No policies have been shared with you yet.</p>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Type</th>
                  <th>Policy #</th>
                  <th>Premium</th>
                  <th>Permission</th>
                </tr>
              </thead>
              <tbody>
                {sharedPolicies.map(sp => (
                  <tr key={sp.share_id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/policies/${sp.policy.id}`)}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{sp.policy.nickname || sp.policy.carrier}</div>
                        {sp.policy.nickname && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{sp.policy.carrier}</div>}
                        <span className="badge badge-info">shared</span>
                      </div>
                    </td>
                    <td>{sp.policy.policy_type}</td>
                    <td>{sp.policy.policy_number}</td>
                    <td>{sp.policy.premium_amount ? `$${sp.policy.premium_amount.toLocaleString()}` : '-'}</td>
                    <td><span className={`badge badge-${sp.permission === 'edit' ? 'success' : 'info'}`}>{sp.permission}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        open={deleteConfirm !== null}
        title="Delete policy"
        message="This will permanently delete this policy and all associated data. This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteConfirm !== null && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}

