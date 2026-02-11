'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { policiesApi, renewalsApi, remindersApi, premiumsApi, sharingApi, documentsApi, gapsApi, scoresApi, inboundApi, Policy, PolicyCreate, RenewalItem, SmartAlert, SharedPolicy, PendingShare, CoverageGap, CoverageSummary, CoverageScoresResult, InboundAddress, PolicyDraftData } from '../../../lib/api';
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
  const [coverageGaps, setCoverageGaps] = useState<CoverageGap[]>([]);
  const [coverageSummary, setCoverageSummary] = useState<CoverageSummary | null>(null);
  const [coverageScores, setCoverageScores] = useState<CoverageScoresResult | null>(null);
  const [inboundAddress, setInboundAddress] = useState<InboundAddress | null>(null);
  const [pendingDrafts, setPendingDrafts] = useState<PolicyDraftData[]>([]);
  const [showDraftModal, setShowDraftModal] = useState<PolicyDraftData | null>(null);
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [creatingAddress, setCreatingAddress] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const createFileRef = useRef<HTMLInputElement>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardMethod, setWizardMethod] = useState<'upload' | 'email' | ''>('');
  const [wizardData, setWizardData] = useState<{ scope: string; policy_type: string; business_name: string }>({ scope: '', policy_type: '', business_name: '' });
  const [existingBusinessNames, setExistingBusinessNames] = useState<string[]>([]);
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
      const [pols, rens, spend, shared, pending, alerts, gapsResult, scoresResult, addressResult, draftsResult] = await Promise.all([
        policiesApi.list(),
        renewalsApi.upcoming(90),
        premiumsApi.annualSpend(),
        sharingApi.sharedWithMe(),
        sharingApi.pending(),
        remindersApi.smart().catch(() => []),
        gapsApi.analyze().catch(() => ({ gaps: [], summary: null, policy_count: 0 })),
        scoresApi.get().catch(() => null),
        inboundApi.getAddress().catch(() => ({ address: null })),
        inboundApi.listDrafts('pending').catch(() => ({ items: [], total: 0 })),
      ]);
      setPolicies(Array.isArray(pols) ? pols : []);
      setRenewals(Array.isArray(rens) ? rens : []);
      setAnnualSpend(spend.annual_spend_cents || 0);
      setSharedPolicies(Array.isArray(shared) ? shared : []);
      setPendingShares(Array.isArray(pending) ? pending : []);
      setSmartAlerts(Array.isArray(alerts) ? alerts : []);
      setCoverageGaps(gapsResult.gaps || []);
      setCoverageSummary(gapsResult.summary || null);
      setCoverageScores(scoresResult);
      setInboundAddress(addressResult?.address || null);
      setPendingDrafts(draftsResult?.items || []);
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
        business_name: wizardData.scope === 'business' ? (wizardData.business_name || null) : null,
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
    setWizardStep(0);
    setWizardMethod('');
    setWizardData({ scope: '', policy_type: '', business_name: '' });
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

  const handleCreateInboundAddress = async () => {
    setCreatingAddress(true);
    try {
      const result = await inboundApi.createAddress();
      setInboundAddress(result);
      toast('Email address created!', 'success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingAddress(false);
    }
  };

  const handleApproveDraft = async (draft: PolicyDraftData) => {
    try {
      const result = await inboundApi.approveDraft(draft.id, {
        policy_type: draft.policy_type || 'other',
        scope: 'personal',
      });
      toast(result.action === 'created' ? 'Policy created from draft!' : 'Policy updated!', 'success');
      setShowDraftModal(null);
      loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRejectDraft = async (draftId: number) => {
    try {
      await inboundApi.rejectDraft(draftId);
      toast('Draft discarded', 'success');
      setShowDraftModal(null);
      loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast('Copied to clipboard!', 'success');
  };

  // Computed values for insights
  const activePolicies = policies.filter(p => p.carrier !== 'Pending extraction...');
  const nextRenewal = renewals.length > 0 ? renewals[0] : null;
  const daysToNextRenewal = nextRenewal ? Math.ceil((new Date(nextRenewal.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const urgentAlerts = smartAlerts.filter(a => a.severity === 'high');
  const typeCounts: Record<string, number> = {};
  activePolicies.forEach(p => { typeCounts[p.policy_type] = (typeCounts[p.policy_type] || 0) + 1; });

  // Compute policy-level status based on gaps
  const getPolicyStatus = (policyId: number): { status: 'ok' | 'warning' | 'alert'; label: string; color: string; bgColor: string } => {
    const policyGaps = coverageGaps.filter(g =>
      g.policy_id === policyId ||
      (g.id && g.id.includes(`_${policyId}`))
    );
    const hasHigh = policyGaps.some(g => g.severity === 'high');
    const hasMedium = policyGaps.some(g => g.severity === 'medium');

    if (hasHigh) return { status: 'alert', label: 'Needs Attention', color: '#991b1b', bgColor: '#fee2e2' };
    if (hasMedium) return { status: 'warning', label: 'Review Suggested', color: '#92400e', bgColor: '#fef3c7' };
    return { status: 'ok', label: 'Good', color: '#166534', bgColor: '#dcfce7' };
  };

  // Search filter
  const q = search.toLowerCase().trim();
  const filteredPolicies = activePolicies.filter(p => {
    if (!q) return true;
    return (
      p.carrier.toLowerCase().includes(q) ||
      p.policy_number.toLowerCase().includes(q) ||
      p.policy_type.toLowerCase().includes(q) ||
      (p.nickname || '').toLowerCase().includes(q) ||
      (p.business_name || '').toLowerCase().includes(q)
    );
  });

  // Group policies by scope, then by type/business
  const personalPolicies = filteredPolicies.filter(p => p.scope === 'personal');
  const businessPolicies = filteredPolicies.filter(p => p.scope === 'business');

  const personalByType: Record<string, Policy[]> = {};
  personalPolicies.forEach(p => {
    const key = p.policy_type || 'other';
    if (!personalByType[key]) personalByType[key] = [];
    personalByType[key].push(p);
  });

  const businessByName: Record<string, Record<string, Policy[]>> = {};
  businessPolicies.forEach(p => {
    const bizName = p.business_name || 'Ungrouped';
    if (!businessByName[bizName]) businessByName[bizName] = {};
    const typeKey = p.policy_type || 'other';
    if (!businessByName[bizName][typeKey]) businessByName[bizName][typeKey] = [];
    businessByName[bizName][typeKey].push(p);
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

  const renderPolicyRow = (p: Policy) => {
    const policyStatus = getPolicyStatus(p.id);
    return (
      <div
        key={p.id}
        onClick={() => router.push(`/policies/${p.id}`)}
        style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px',
          backgroundColor: '#fff',
          border: `1px solid ${policyStatus.status === 'alert' ? '#fecaca' : policyStatus.status === 'warning' ? '#fde68a' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = policyStatus.status === 'alert' ? '#fecaca' : policyStatus.status === 'warning' ? '#fde68a' : 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: policyStatus.status === 'alert' ? '#dc2626' : policyStatus.status === 'warning' ? '#f59e0b' : '#22c55e', flexShrink: 0 }} title={policyStatus.label} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>{p.nickname || p.carrier}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', backgroundColor: policyStatus.bgColor, color: policyStatus.color, borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
              {policyStatus.status === 'alert' ? '⚠️' : policyStatus.status === 'warning' ? '💡' : '✓'} {policyStatus.label}
            </span>
            {p.shared_with && p.shared_with.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                👥 Shared ({p.shared_with.length})
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {p.policy_number}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {p.renewal_date && (() => {
            const daysUntil = Math.ceil((new Date(p.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const isPast = daysUntil < 0;
            const isUrgent = daysUntil <= 7;
            const isRenewingSoon = daysUntil <= 30 && daysUntil > 7;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                {isPast ? (
                  <span style={{ padding: '2px 8px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>Overdue</span>
                ) : isUrgent ? (
                  <span style={{ padding: '2px 8px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>Urgent</span>
                ) : isRenewingSoon ? (
                  <span style={{ padding: '2px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>Renewing soon</span>
                ) : (
                  <span style={{ padding: '2px 8px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: 12, fontSize: 11, fontWeight: 500 }}>OK</span>
                )}
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{new Date(p.renewal_date).toLocaleDateString()}</div>
              </div>
            );
          })()}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(p.id); }}
          className="btn btn-outline"
          style={{ padding: '6px 12px', fontSize: 12, color: 'var(--color-danger, #dc2626)', borderColor: 'var(--color-danger, #dc2626)', backgroundColor: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          Delete
        </button>
      </div>
    );
  };

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

        {/* Pending Drafts Alert */}
        {pendingDrafts.length > 0 && (
          <div style={{ padding: 20, marginBottom: 24, backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12, color: '#166534' }}>
              📧 {pendingDrafts.length} Policy Draft{pendingDrafts.length > 1 ? 's' : ''} Pending Review
            </div>
            {pendingDrafts.slice(0, 3).map(draft => (
              <div key={draft.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
                  {draft.carrier || 'Unknown Carrier'} - {draft.policy_type || 'Unknown Type'}
                  {draft.original_filename && <span style={{ marginLeft: 8, opacity: 0.7 }}>({draft.original_filename})</span>}
                </span>
                <button onClick={() => setShowDraftModal(draft)} className="btn btn-sm" style={{ padding: '6px 16px', fontSize: 13, backgroundColor: '#22c55e', color: '#fff', border: 'none' }}>Review</button>
              </div>
            ))}
            {pendingDrafts.length > 3 && (
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8 }}>
                +{pendingDrafts.length - 3} more
              </div>
            )}
          </div>
        )}

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

        {/* Coverage Score Card */}
        {!loading && coverageScores && coverageScores.overall.score > 0 && (
          <section style={{ marginBottom: 40 }}>
            <div style={{
              padding: 24,
              backgroundColor: '#fff',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>
                    Protection Score
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
                    How well protected are you?
                  </p>
                </div>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: coverageScores.overall.score >= 70 ? '#dcfce7' : coverageScores.overall.score >= 40 ? '#fef3c7' : '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}>
                  <span style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: coverageScores.overall.score >= 70 ? '#166534' : coverageScores.overall.score >= 40 ? '#92400e' : '#991b1b',
                  }}>
                    {coverageScores.overall.score}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>/ 100</span>
                </div>
              </div>

              {/* Category bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(coverageScores.categories).filter(([_, data]) => data.score > 0).map(([cat, data]) => (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>{cat}</span>
                      <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{data.score}%</span>
                    </div>
                    <div style={{ height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${data.score}%`,
                        height: '100%',
                        backgroundColor: data.score >= 70 ? '#22c55e' : data.score >= 40 ? '#f59e0b' : '#ef4444',
                        borderRadius: 4,
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Insights */}
              {coverageScores.overall.insights.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8 }}>Suggestions</div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {coverageScores.overall.insights.slice(0, 3).map((insight, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{insight}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
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
            🔍 COVERAGE GAPS - Intelligence insights
        ═══════════════════════════════════════════════════════════════ */}
        {!loading && coverageGaps.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
              Coverage Gaps
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {coverageGaps.filter(g => g.severity !== 'info').slice(0, 5).map((gap) => (
                <div
                  key={gap.id}
                  style={{
                    padding: 16,
                    backgroundColor: gap.severity === 'high' ? '#fef2f2' : gap.severity === 'medium' ? '#fffbeb' : '#f0fdf4',
                    border: `1px solid ${gap.severity === 'high' ? '#fecaca' : gap.severity === 'medium' ? '#fde68a' : '#bbf7d0'}`,
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: gap.severity === 'high' ? '#fee2e2' : gap.severity === 'medium' ? '#fef3c7' : '#dcfce7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {gap.severity === 'high' ? '⚠️' : gap.severity === 'medium' ? '💡' : '✓'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{gap.name}</span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          backgroundColor: gap.severity === 'high' ? '#fee2e2' : gap.severity === 'medium' ? '#fef3c7' : '#dcfce7',
                          color: gap.severity === 'high' ? '#991b1b' : gap.severity === 'medium' ? '#92400e' : '#166534',
                        }}>
                          {gap.severity}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 8px', lineHeight: 1.5 }}>
                        {gap.description}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0, fontStyle: 'italic' }}>
                        {gap.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Show info-level gaps collapsed */}
              {coverageGaps.filter(g => g.severity === 'info').length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ fontSize: 13, color: 'var(--color-text-muted)', cursor: 'pointer', padding: '8px 0' }}>
                    {coverageGaps.filter(g => g.severity === 'info').length} additional suggestions
                  </summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {coverageGaps.filter(g => g.severity === 'info').map((gap) => (
                      <div
                        key={gap.id}
                        style={{
                          padding: 12,
                          backgroundColor: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', marginBottom: 4 }}>{gap.name}</div>
                        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>{gap.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
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
            <>
              {/* ── PERSONAL SECTION ── */}
              {personalPolicies.length > 0 && (
                <div style={{ marginBottom: businessPolicies.length > 0 ? 32 : 0 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                    Personal ({personalPolicies.length})
                  </h3>
                  {Object.entries(personalByType).map(([typeKey, typePolicies]) => (
                    <div key={typeKey} style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 16 }}>{POLICY_TYPE_CONFIG[typeKey]?.icon || '📋'}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                          {POLICY_TYPE_CONFIG[typeKey]?.label || typeKey}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {typePolicies.map(p => renderPolicyRow(p))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Divider ── */}
              {personalPolicies.length > 0 && businessPolicies.length > 0 && (
                <div style={{ borderTop: '1px solid var(--color-border)', marginBottom: 24 }} />
              )}

              {/* ── BUSINESS SECTION ── */}
              {businessPolicies.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                    Business ({businessPolicies.length})
                  </h3>
                  {Object.entries(businessByName).map(([bizName, typeGroups]) => (
                    <div key={bizName} style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 16 }}>🏢</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{bizName}</span>
                      </div>
                      {Object.entries(typeGroups).map(([typeKey, typePolicies]) => (
                        <div key={typeKey} style={{ marginLeft: 24, marginBottom: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <span style={{ fontSize: 14 }}>{POLICY_TYPE_CONFIG[typeKey]?.icon || '📋'}</span>
                            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)' }}>
                              {POLICY_TYPE_CONFIG[typeKey]?.label || typeKey}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {typePolicies.map(p => renderPolicyRow(p))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </>
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

            {/* Step 0: Method Choice */}
            {wizardStep === 0 && (
              <div>
                <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 20 }}>How would you like to add your policy?</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button
                    onClick={() => { setWizardMethod('upload'); setWizardStep(1); }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 24,
                      border: '2px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff', cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 32 }}>📄</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Upload PDF</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>Upload a document and auto-extract details</span>
                  </button>
                  <button
                    onClick={() => { setWizardMethod('email'); setWizardStep(-1); }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 24,
                      border: '2px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff', cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 32 }}>📧</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Email Import</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>Forward policy docs to your unique address</span>
                  </button>
                </div>
              </div>
            )}

            {/* Email Import Path */}
            {wizardStep === -1 && (
              <div>
                <button onClick={() => { setWizardStep(0); setWizardMethod(''); }} className="btn btn-ghost" style={{ marginBottom: 16, padding: '4px 8px', fontSize: 13 }}>&larr; Back</button>
                <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>Add Policies by Email</h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 20px' }}>
                  Forward policy documents to your unique email address and we&apos;ll extract the details automatically.
                </p>
                {!inboundAddress ? (
                  <button
                    onClick={handleCreateInboundAddress}
                    disabled={creatingAddress}
                    className="btn btn-primary"
                    style={{ padding: '12px 24px', fontSize: 14 }}
                  >
                    {creatingAddress ? 'Creating...' : 'Generate Email Address'}
                  </button>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#f9fafb', borderRadius: 8, marginBottom: 16 }}>
                      <input type="text" readOnly value={inboundAddress.email} style={{ flex: 1, padding: '10px 14px', fontSize: 14, fontFamily: 'monospace', border: '1px solid var(--color-border)', borderRadius: 6, backgroundColor: '#fff' }} />
                      <button onClick={() => copyToClipboard(inboundAddress.email)} className="btn btn-primary" style={{ padding: '10px 20px', fontSize: 14 }}>Copy</button>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      <strong>How it works:</strong>
                      <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                        <li>Forward or send policy PDFs to this address</li>
                        <li>We&apos;ll extract the policy details automatically</li>
                        <li>Review and approve drafts to add them to your account</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Scope */}
            {wizardStep === 1 && (
              <div>
                <button onClick={() => { setWizardStep(0); setWizardMethod(''); }} className="btn btn-ghost" style={{ marginBottom: 16, padding: '4px 8px', fontSize: 13 }}>&larr; Back</button>
                <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 20 }}>What type of policy is this?</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { value: 'personal', icon: '👤', label: 'Personal' },
                    { value: 'business', icon: '🏢', label: 'Business' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setWizardData(d => ({ ...d, scope: opt.value }));
                        if (opt.value === 'business') {
                          policiesApi.businessNames().then(setExistingBusinessNames).catch(() => {});
                          setWizardStep(15); // business name step
                        } else {
                          setWizardStep(2);
                        }
                      }}
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

            {/* Step 1.5: Business Name */}
            {wizardStep === 15 && (
              <div>
                <button onClick={() => setWizardStep(1)} className="btn btn-ghost" style={{ marginBottom: 16, padding: '4px 8px', fontSize: 13 }}>&larr; Back</button>
                <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 20 }}>Which business is this policy for?</p>
                <input
                  list="business-names-list"
                  value={wizardData.business_name}
                  onChange={e => setWizardData(d => ({ ...d, business_name: e.target.value }))}
                  placeholder="e.g. Acme Corp"
                  style={{
                    width: '100%', padding: '12px 16px', fontSize: 15, border: '2px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)', marginBottom: 16, boxSizing: 'border-box',
                  }}
                  autoFocus
                />
                <datalist id="business-names-list">
                  {existingBusinessNames.map(n => <option key={n} value={n} />)}
                </datalist>
                <button
                  onClick={() => setWizardStep(2)}
                  disabled={!wizardData.business_name.trim()}
                  className="btn btn-accent"
                  style={{ padding: '12px 24px', fontSize: 15, fontWeight: 600, width: '100%' }}
                >
                  Next
                </button>
              </div>
            )}

            {/* Step 2: Type */}
            {wizardStep === 2 && (
              <div>
                <button onClick={() => setWizardStep(wizardData.scope === 'business' ? 15 : 1)} className="btn btn-ghost" style={{ marginBottom: 16, padding: '4px 8px', fontSize: 13 }}>&larr; Back</button>
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
                <button onClick={() => setWizardStep(2)} disabled={uploading || extracting} className="btn btn-ghost" style={{ marginBottom: 16, padding: '4px 8px', fontSize: 13 }}>&larr; Back</button>
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

      {/* ═══════════════════════════════════════════════════════════════
          DRAFT REVIEW MODAL
      ═══════════════════════════════════════════════════════════════ */}
      {showDraftModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', padding: 32, maxWidth: 550, width: '100%', maxHeight: '90vh', overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>Review Policy Draft</h2>
              <button onClick={() => setShowDraftModal(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--color-text-muted)' }}>×</button>
            </div>

            {/* Source info */}
            {showDraftModal.original_filename && (
              <div style={{ padding: 12, backgroundColor: '#f9fafb', borderRadius: 8, marginBottom: 20, fontSize: 13, color: 'var(--color-text-muted)' }}>
                📄 Source: {showDraftModal.original_filename}
              </div>
            )}

            {/* Match indicator */}
            {showDraftModal.matched_policy_id && (
              <div style={{ padding: 12, backgroundColor: '#fef3c7', borderRadius: 8, marginBottom: 20, fontSize: 13, color: '#92400e' }}>
                ⚠️ This appears to match an existing policy. Approving will update that policy.
              </div>
            )}

            {/* Extracted data */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 12 }}>Extracted Information</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Carrier</span>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{showDraftModal.carrier || 'Unknown'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Policy Number</span>
                  <span style={{ fontWeight: 500, fontSize: 14, fontFamily: 'monospace' }}>{showDraftModal.policy_number || 'TBD'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Policy Type</span>
                  <span style={{ fontWeight: 500, fontSize: 14, textTransform: 'capitalize' }}>{showDraftModal.policy_type || 'other'}</span>
                </div>
                {showDraftModal.extraction_data && (
                  <>
                    {(showDraftModal.extraction_data as any).coverage_amount && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Coverage</span>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>${((showDraftModal.extraction_data as any).coverage_amount).toLocaleString()}</span>
                      </div>
                    )}
                    {(showDraftModal.extraction_data as any).deductible && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Deductible</span>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>${((showDraftModal.extraction_data as any).deductible).toLocaleString()}</span>
                      </div>
                    )}
                    {(showDraftModal.extraction_data as any).premium_amount && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Premium</span>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>${((showDraftModal.extraction_data as any).premium_amount).toLocaleString()}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => handleApproveDraft(showDraftModal)}
                className="btn btn-accent"
                style={{ flex: 1, padding: '14px 24px', fontSize: 15, fontWeight: 600 }}
              >
                {showDraftModal.matched_policy_id ? 'Update Existing Policy' : 'Create Policy'}
              </button>
              <button
                onClick={() => handleRejectDraft(showDraftModal.id)}
                className="btn btn-outline"
                style={{ padding: '14px 24px', fontSize: 15, color: '#dc2626', borderColor: '#dc2626' }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
