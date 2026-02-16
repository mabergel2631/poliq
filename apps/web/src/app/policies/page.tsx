'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { policiesApi, renewalsApi, remindersApi, premiumsApi, sharingApi, documentsApi, gapsApi, inboundApi, profileApi, Policy, PolicyCreate, RenewalItem, SmartAlert, SharedPolicy, PendingShare, CoverageGap, CoverageSummary, InboundAddress, PolicyDraftData } from '../../../lib/api';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { APP_NAME } from '../config';
import { POLICY_TYPE_CONFIG, POLICY_TYPES, STATUS_COLORS, SEVERITY_COLORS } from '../constants';
import TabNav from '../components/TabNav';

export default function PoliciesPage() {
  return (
    <Suspense>
      <PoliciesPageInner />
    </Suspense>
  );
}

function PoliciesPageInner() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [renewals, setRenewals] = useState<RenewalItem[]>([]);
  const [annualSpend, setAnnualSpend] = useState<number>(0);
  const [sharedPolicies, setSharedPolicies] = useState<SharedPolicy[]>([]);
  const [pendingShares, setPendingShares] = useState<PendingShare[]>([]);
  const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([]);
  const [coverageGaps, setCoverageGaps] = useState<CoverageGap[]>([]);
  const [coverageSummary, setCoverageSummary] = useState<CoverageSummary | null>(null);
  const [inboundAddress, setInboundAddress] = useState<InboundAddress | null>(null);
  const [pendingDrafts, setPendingDrafts] = useState<PolicyDraftData[]>([]);
  const [showDraftModal, setShowDraftModal] = useState<PolicyDraftData | null>(null);
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [creatingAddress, setCreatingAddress] = useState(false);
  const [scopeTab, setScopeTab] = useState<'all' | 'personal' | 'business'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const createFileRef = useRef<HTMLInputElement>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardMethod, setWizardMethod] = useState<'upload' | 'url' | 'email' | ''>('');
  const [wizardData, setWizardData] = useState<{ scope: string; policy_type: string; business_name: string }>({ scope: '', policy_type: '', business_name: '' });
  const [existingBusinessNames, setExistingBusinessNames] = useState<string[]>([]);
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [importingUrl, setImportingUrl] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [profileDismissed, setProfileDismissed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    loadAll();
  }, [token]);

  // Handle deep-link from entity page: ?addPolicy=true&scope=business&businessName=...
  useEffect(() => {
    if (loading) return;
    const addPolicy = searchParams.get('addPolicy');
    if (addPolicy === 'true') {
      const scope = searchParams.get('scope') || '';
      const bizName = searchParams.get('businessName') || '';
      setWizardData({ scope, policy_type: '', business_name: bizName });
      setShowAddModal(true);
      setWizardStep(0); // Start at method choice — scope + business name already filled
      // Clear the query params so refreshing doesn't re-trigger
      router.replace('/policies', { scroll: false });
    }
  }, [loading, searchParams]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [pols, rens, spend, shared, pending, alerts, gapsResult, addressResult, draftsResult] = await Promise.all([
        policiesApi.list(),
        renewalsApi.upcoming(90),
        premiumsApi.annualSpend(),
        sharingApi.sharedWithMe(),
        sharingApi.pending(),
        remindersApi.smart().catch(() => []),
        gapsApi.analyze().catch(() => ({ gaps: [], summary: null, policy_count: 0 })),
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
      setInboundAddress(addressResult?.address || null);
      setPendingDrafts(draftsResult?.items || []);

      // Check profile completion (non-blocking)
      try {
        const { profile } = await profileApi.get();
        const flags = [profile.is_homeowner, profile.is_renter, profile.has_dependents, profile.has_vehicle, profile.owns_business, profile.high_net_worth];
        const noFlagsSet = flags.every(f => !f);
        const noName = !profile.full_name;
        setProfileIncomplete(noFlagsSet && noName);
      } catch { /* ignore */ }
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

  const handleUrlImport = async () => {
    const url = urlInput.trim();
    if (!url) return;
    setImportingUrl(true);
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

      const importResult = await documentsApi.importFromUrl(newPolicy.id, url);

      setExtracting(true);
      try {
        const extractResult = await documentsApi.extract(importResult.document_id);
        sessionStorage.setItem(`pv_extract_${newPolicy.id}`, JSON.stringify({
          docId: extractResult.document_id,
          data: extractResult.extraction,
        }));
      } catch {}

      setExtracting(false);
      setImportingUrl(false);
      setShowAddModal(false);
      resetWizard();
      router.push(`/policies/${newPolicy.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to import from URL');
      setImportingUrl(false);
      setExtracting(false);
    }
  };

  const resetWizard = () => {
    setWizardStep(0);
    setWizardMethod('');
    setWizardData({ scope: '', policy_type: '', business_name: '' });
    setUploading(false);
    setUploadProgress(null);
    setExtracting(false);
    setUrlInput('');
    setImportingUrl(false);
    setShowNewGroupInput(false);
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
  const hasMultipleScopes = activePolicies.some(p => p.scope === 'personal') && activePolicies.some(p => p.scope === 'business');
  const scopedPolicies = scopeTab === 'all' ? activePolicies : activePolicies.filter(p => p.scope === scopeTab);
  const scopedPolicyIds = new Set(scopedPolicies.map(p => p.id));
  const scopedRenewals = scopeTab === 'all' ? renewals : renewals.filter(r => scopedPolicyIds.has(r.id));
  const nextRenewal = scopedRenewals.length > 0 ? scopedRenewals[0] : null;
  const daysToNextRenewal = nextRenewal ? Math.ceil((new Date(nextRenewal.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const urgentAlerts = smartAlerts.filter(a => a.severity === 'high' && (scopeTab === 'all' || scopedPolicyIds.has(a.policy_id)));
  const typeCounts: Record<string, number> = {};
  scopedPolicies.forEach(p => { typeCounts[p.policy_type] = (typeCounts[p.policy_type] || 0) + 1; });

  // Compute policy-level status based on gaps
  const getPolicyStatus = (policyId: number): { status: 'ok' | 'warning' | 'alert'; label: string; color: string; bgColor: string } => {
    const policyGaps = coverageGaps.filter(g =>
      g.policy_id === policyId ||
      (g.id && g.id.includes(`_${policyId}`))
    );
    const hasHigh = policyGaps.some(g => g.severity === 'high');
    const hasMedium = policyGaps.some(g => g.severity === 'medium');

    if (hasHigh) return { status: 'alert', label: 'Needs Attention', color: 'var(--color-danger-dark)', bgColor: 'var(--color-danger-light)' };
    if (hasMedium) return { status: 'warning', label: 'Review Suggested', color: 'var(--color-warning-dark)', bgColor: 'var(--color-warning-light)' };
    return { status: 'ok', label: 'Good', color: 'var(--color-success-dark)', bgColor: 'var(--color-success-light)' };
  };

  // Search filter (from scoped policies)
  const q = search.toLowerCase().trim();
  const filteredPolicies = scopedPolicies.filter(p => {
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

  // Generate insights (scoped)
  const insights: string[] = [];
  if (scopedPolicies.length > 0) {
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
      insights.push(`Annual premium: $${(annualSpend / 100).toLocaleString()}${scopeTab !== 'all' ? ' (all policies)' : ''}.`);
    }
  }

  const renderPolicyRow = (p: Policy) => {
    const policyStatus = getPolicyStatus(p.id);
    return (
      <div
        key={p.id}
        role="button"
        tabIndex={0}
        onClick={() => router.push(`/policies/${p.id}`)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/policies/${p.id}`); } }}
        style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px',
          backgroundColor: '#fff',
          border: `1px solid ${policyStatus.status === 'alert' ? 'var(--color-danger-border)' : policyStatus.status === 'warning' ? 'var(--color-warning-border)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = policyStatus.status === 'alert' ? 'var(--color-danger-border)' : policyStatus.status === 'warning' ? 'var(--color-warning-border)' : 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: policyStatus.status === 'alert' ? 'var(--color-danger)' : policyStatus.status === 'warning' ? 'var(--color-warning)' : 'var(--color-success)', flexShrink: 0 }} title={policyStatus.label} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>{p.nickname || p.carrier}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', backgroundColor: policyStatus.bgColor, color: policyStatus.color, borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
              {policyStatus.status === 'alert' ? '⚠️' : policyStatus.status === 'warning' ? '💡' : '✓'} {policyStatus.label}
            </span>
            {p.status && p.status !== 'active' && (() => {
              const sc = STATUS_COLORS[p.status] || STATUS_COLORS.archived;
              return (
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                  backgroundColor: sc.bg, color: sc.fg,
                }}>
                  {p.status === 'expired' ? 'Expired' : 'Archived'}
                </span>
              );
            })()}
            {p.shared_with && p.shared_with.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', backgroundColor: 'var(--color-info-light)', color: 'var(--color-info-dark)', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
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
                  <span style={{ padding: '2px 8px', backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger-dark)', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>Overdue</span>
                ) : isUrgent ? (
                  <span style={{ padding: '2px 8px', backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning-dark)', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>Urgent</span>
                ) : isRenewingSoon ? (
                  <span style={{ padding: '2px 8px', backgroundColor: 'var(--color-info-light)', color: 'var(--color-info-dark)', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>Renewing soon</span>
                ) : (
                  <span style={{ padding: '2px 8px', backgroundColor: 'var(--color-success-light)', color: 'var(--color-success-dark)', borderRadius: 12, fontSize: 11, fontWeight: 500 }}>OK</span>
                )}
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{new Date(p.renewal_date).toLocaleDateString()}</div>
              </div>
            );
          })()}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(p.id); }}
          className="btn btn-outline"
          style={{ padding: '6px 12px', fontSize: 12, color: 'var(--color-danger)', borderColor: 'var(--color-danger)', backgroundColor: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-danger-bg)'; }}
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
            1️⃣ COVERAGE STATUS - Status at a glance
        ═══════════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 34, fontWeight: 700, margin: '0 0 20px', color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            {loading ? 'Loading...' : 'Coverage Overview'}
          </h1>

          {!loading && scopedPolicies.length > 0 && (() => {
            // Detect expired policies: either status field is 'expired' OR renewal_date is past
            const expiredPolicies = scopedPolicies.filter(p => {
              if (p.status === 'expired') return true;
              if (p.renewal_date) {
                const days = Math.ceil((new Date(p.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return days < 0 && p.status !== 'archived';
              }
              return false;
            });

            // Build status items — only real issues with existing policies
            const items: { color: string; text: string }[] = [];

            // Red: expired policies
            expiredPolicies.forEach(p => {
              items.push({ color: 'var(--color-danger)', text: `${p.nickname || p.carrier} (${POLICY_TYPE_CONFIG[p.policy_type]?.label || p.policy_type}) is expired` });
            });

            // Red: urgent smart alerts
            urgentAlerts.forEach(a => {
              items.push({ color: 'var(--color-danger)', text: a.title });
            });

            // Yellow: renewals within 60 days (not expired — those are already red above)
            scopedRenewals.forEach(r => {
              const days = Math.ceil((new Date(r.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              if (days > 0 && days <= 60) {
                items.push({ color: 'var(--color-warning)', text: `${r.nickname || r.carrier} renews in ${days} days` });
              }
            });

            // Green: all clear
            if (items.length === 0) {
              items.push({ color: 'var(--color-success)', text: 'All policies current. No upcoming renewals.' });
            }

            return (
              <div style={{
                padding: '24px 28px',
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 'var(--radius-lg)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
                  Status
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                      <span style={{ color: item.color === 'var(--color-success)' ? 'var(--color-text-secondary)' : 'var(--color-text)', fontWeight: item.color === 'var(--color-danger)' ? 600 : 400 }}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
                {annualSpend > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f3f4f6', fontSize: 14, color: 'var(--color-text-secondary)' }}>
                    Annual premium: <strong>${(annualSpend / 100).toLocaleString()}</strong>
                  </div>
                )}
              </div>
            );
          })()}

          {!loading && scopedPolicies.length === 0 && (
            <div style={{
              padding: '24px 28px', backgroundColor: '#fff', border: '1px solid #e5e7eb',
              borderRadius: 'var(--radius-lg)', fontSize: 16, fontWeight: 600, color: 'var(--color-text-muted)',
            }}>
              Get started by adding your first policy
            </div>
          )}
        </section>

        {/* Profile Completion Prompt */}
        {!loading && profileIncomplete && !profileDismissed && (
          <div style={{
            padding: '16px 20px', marginBottom: 24,
            backgroundColor: 'var(--color-info-light)', border: '1px solid var(--color-info-border)',
            borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-info-dark)', marginBottom: 2 }}>Complete your profile</div>
              <div style={{ fontSize: 13, color: 'var(--color-info-dark)', opacity: 0.85 }}>
                Tell us about your situation so we can give you smarter coverage recommendations.
              </div>
            </div>
            <button
              onClick={() => router.push('/profile')}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 600,
                backgroundColor: 'var(--color-primary)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Go to Profile
            </button>
            <button
              onClick={() => setProfileDismissed(true)}
              aria-label="Dismiss"
              style={{
                padding: '4px 8px', fontSize: 16, lineHeight: 1,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-info-dark)', opacity: 0.6,
              }}
            >
              &times;
            </button>
          </div>
        )}

        {/* Scope Tabs */}
        {!loading && hasMultipleScopes && (
          <div style={{ marginBottom: 24 }}>
            <TabNav
              variant="segmented"
              activeKey={scopeTab}
              onSelect={(key) => setScopeTab(key as 'all' | 'personal' | 'business')}
              tabs={[
                { key: 'all', label: 'All' },
                { key: 'personal', label: 'Personal' },
                { key: 'business', label: 'Business' },
              ]}
            />
          </div>
        )}

        {error && <div className="alert alert-error" style={{ marginBottom: 24 }}>{error}</div>}

        {/* Pending Drafts Alert */}
        {pendingDrafts.length > 0 && (
          <div style={{ padding: 20, marginBottom: 24, backgroundColor: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12, color: 'var(--color-success-dark)' }}>
              📧 {pendingDrafts.length} Policy Draft{pendingDrafts.length > 1 ? 's' : ''} Pending Review
            </div>
            {pendingDrafts.slice(0, 3).map(draft => (
              <div key={draft.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
                  {draft.carrier || 'Unknown Carrier'} - {draft.policy_type || 'Unknown Type'}
                  {draft.original_filename && <span style={{ marginLeft: 8, opacity: 0.7 }}>({draft.original_filename})</span>}
                </span>
                <button onClick={() => setShowDraftModal(draft)} className="btn btn-sm" style={{ padding: '6px 16px', fontSize: 13, backgroundColor: 'var(--color-success)', color: '#fff', border: 'none' }}>Review</button>
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

        {/* ═══════════════════════════════════════════════════════════════
            2️⃣ COVERAGE INSIGHTS
        ═══════════════════════════════════════════════════════════════ */}
        {!loading && insights.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Coverage Insights</h2>
            <div style={{
              padding: '20px 24px',
              backgroundColor: '#fff',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {insights.slice(0, 4).map((insight, i) => (
                  <p key={i} style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>{insight}</p>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Urgent Alerts */}
        {urgentAlerts.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Needs Attention</h2>
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
            3️⃣ ACTIONS
        ═══════════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: 40 }}>
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
            4️⃣ YOUR COVERAGE
        ═══════════════════════════════════════════════════════════════ */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Your Coverage {scopedPolicies.length > 0 && `(${scopedPolicies.length})`}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {activePolicies.length > 3 && (
                <input
                  className="form-input"
                  placeholder="Search..."
                  aria-label="Search policies"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: 200, padding: '8px 12px', fontSize: 14 }}
                />
              )}
            </div>
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
              {personalPolicies.length > 0 && scopeTab !== 'business' && (
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
              {personalPolicies.length > 0 && businessPolicies.length > 0 && scopeTab === 'all' && (
                <div style={{ borderTop: '1px solid var(--color-border)', marginBottom: 24 }} />
              )}

              {/* ── BUSINESS SECTION ── */}
              {businessPolicies.length > 0 && scopeTab !== 'personal' && (
                <div>
                  <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                    Business ({businessPolicies.length})
                  </h3>
                  {Object.entries(businessByName).map(([bizName, typeGroups]) => (
                    <div key={bizName} style={{ marginBottom: 24 }}>
                      <div
                        onClick={bizName !== 'Ungrouped' ? () => router.push(`/policies/business/${encodeURIComponent(bizName)}`) : undefined}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: bizName !== 'Ungrouped' ? 'pointer' : 'default' }}
                      >
                        <span style={{ fontSize: 16 }}>🏢</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', transition: 'color 0.15s' }}
                          onMouseEnter={bizName !== 'Ungrouped' ? (e) => { e.currentTarget.style.color = 'var(--color-primary)'; } : undefined}
                          onMouseLeave={bizName !== 'Ungrouped' ? (e) => { e.currentTarget.style.color = 'var(--color-text)'; } : undefined}
                        >{bizName}</span>
                        {bizName !== 'Ungrouped' && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>&rarr;</span>}
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

        {/* ═══════════════════════════════════════════════════════════════
            💡 RECOMMENDATIONS — grouped by Personal / Business
        ═══════════════════════════════════════════════════════════════ */}
        {(() => {
          const PERSONAL_CATEGORIES = new Set(['auto_liability', 'personal_property', 'life_insurance', 'umbrella_liability', 'dwelling_coverage']);
          const BUSINESS_CATEGORIES = new Set(['general_liability', 'cyber_liability', 'employment_practices', 'professional_liability']);
          const portfolioGaps = coverageGaps.filter(g => !g.policy_id);
          const personalGaps = portfolioGaps.filter(g => PERSONAL_CATEGORIES.has(g.category));
          const businessGaps = portfolioGaps.filter(g => BUSINESS_CATEGORIES.has(g.category));

          const showPersonal = scopeTab !== 'business' && personalGaps.length > 0;
          const showBusiness = scopeTab !== 'personal' && businessGaps.length > 0;

          if (!loading && (showPersonal || showBusiness)) {
            const renderGapCard = (gap: CoverageGap) => {
              const sev = SEVERITY_COLORS[gap.severity] || SEVERITY_COLORS.info;
              return (
              <div
                key={gap.id}
                style={{
                  padding: 16,
                  backgroundColor: gap.severity === 'high' ? 'var(--color-danger-bg)' : gap.severity === 'medium' ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
                  border: `1px solid ${gap.severity === 'high' ? 'var(--color-danger-border)' : gap.severity === 'medium' ? 'var(--color-warning-border)' : 'var(--color-success-border)'}`,
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    backgroundColor: sev.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {sev.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{gap.name}</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                        backgroundColor: sev.bg, color: sev.fg,
                      }}>
                        {gap.severity}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 8px', lineHeight: 1.5 }}>{gap.description}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0, fontStyle: 'italic' }}>{gap.recommendation}</p>
                  </div>
                </div>
              </div>
            );
            };

            const renderGapGroup = (label: string, icon: string, gaps: CoverageGap[]) => {
              const actionable = gaps.filter(g => g.severity !== 'info');
              const info = gaps.filter(g => g.severity === 'info');
              return (
                <div key={label}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 16 }}>{icon}</span>
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{label}</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {actionable.map(renderGapCard)}
                    {info.length > 0 && (
                      <details style={{ marginTop: 4 }}>
                        <summary style={{ fontSize: 13, color: 'var(--color-text-muted)', cursor: 'pointer', padding: '8px 0' }}>
                          {info.length} additional suggestion{info.length !== 1 ? 's' : ''}
                        </summary>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                          {info.map((gap) => (
                            <div key={gap.id} style={{ padding: 12, backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 'var(--radius-sm)' }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', marginBottom: 4 }}>{gap.name}</div>
                              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>{gap.recommendation}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <section style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                  Recommendations
                </h2>
                {showPersonal && renderGapGroup('Personal', '👤', personalGaps)}
                {showBusiness && renderGapGroup('Business', '🏢', businessGaps)}
              </section>
            );
          }
          return null;
        })()}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ADD POLICY MODAL
      ═══════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24
        }}>
          <div role="dialog" aria-modal="true" aria-labelledby="add-policy-title" style={{
            backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', padding: 32, maxWidth: 500, width: '100%', maxHeight: '90vh', overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: wizardData.business_name ? 12 : 24 }}>
              <h2 id="add-policy-title" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>Add Policy</h2>
              <button onClick={() => { setShowAddModal(false); resetWizard(); }} aria-label="Close dialog" style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--color-text-muted)' }}>×</button>
            </div>

            {/* Entity context banner */}
            {wizardData.business_name && (
              <div style={{ padding: '10px 14px', backgroundColor: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-sm)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span>🏢</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>Adding to</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{wizardData.business_name}</span>
              </div>
            )}

            {/* Step 0: Method Choice */}
            {wizardStep === 0 && (
              <div>
                <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 20 }}>How would you like to add your policy?</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button
                    onClick={() => { setWizardMethod('upload'); setWizardStep(wizardData.scope && wizardData.business_name ? 2 : 1); }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 24,
                      border: '2px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff', cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 32 }}>📄</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Upload Policy</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>We&apos;ll extract everything automatically</span>
                  </button>
                  <button
                    onClick={() => { setWizardMethod('url'); setWizardStep(wizardData.scope && wizardData.business_name ? 2 : 1); }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 24,
                      border: '2px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff', cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 32 }}>🔗</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Import from URL</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>Paste a link to a PDF document</span>
                  </button>
                </div>
                {/* Email Import - Coming Soon */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', marginTop: 12,
                    border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: '#f9fafb',
                    opacity: 0.6, cursor: 'default',
                  }}
                >
                  <span style={{ fontSize: 24 }}>📧</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>Email Import</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>Forward policy docs to your unique address</span>
                  </div>
                  <span style={{
                    padding: '3px 10px', backgroundColor: '#e0e7ff', color: '#4338ca', borderRadius: 12,
                    fontSize: 11, fontWeight: 600,
                  }}>Coming Soon</span>
                </div>
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

            {/* Step 1.5: Business Group */}
            {wizardStep === 15 && (
              <div>
                <button onClick={() => { setWizardStep(1); setShowNewGroupInput(false); }} className="btn btn-ghost" style={{ marginBottom: 16, padding: '4px 8px', fontSize: 13 }}>&larr; Back</button>
                <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
                  {showNewGroupInput ? 'Name your new business group' : 'Which business group does this belong to?'}
                </p>

                {showNewGroupInput ? (
                  /* ── New Group: text input ── */
                  <div>
                    <input
                      value={wizardData.business_name}
                      onChange={e => setWizardData(d => ({ ...d, business_name: e.target.value }))}
                      placeholder="e.g. Acme Corp"
                      style={{
                        width: '100%', padding: '12px 16px', fontSize: 15, border: '2px solid var(--color-primary)',
                        borderRadius: 'var(--radius-md)', marginBottom: 16, boxSizing: 'border-box',
                      }}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter' && wizardData.business_name.trim()) setWizardStep(2); }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => { setShowNewGroupInput(false); setWizardData(d => ({ ...d, business_name: '' })); }}
                        className="btn btn-ghost"
                        style={{ padding: '10px 16px', fontSize: 14 }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => setWizardStep(2)}
                        disabled={!wizardData.business_name.trim()}
                        className="btn btn-accent"
                        style={{ flex: 1, padding: '12px 24px', fontSize: 15, fontWeight: 600 }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Group selection ── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Existing business groups */}
                    {existingBusinessNames.map(name => (
                      <button
                        key={name}
                        onClick={() => { setWizardData(d => ({ ...d, business_name: name })); setWizardStep(2); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
                          border: '2px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                          backgroundColor: '#fff', cursor: 'pointer', textAlign: 'left',
                          transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                      >
                        <span style={{ fontSize: 20 }}>🏢</span>
                        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text)' }}>{name}</span>
                      </button>
                    ))}

                    {/* Divider if there are existing groups */}
                    {existingBusinessNames.length > 0 && (
                      <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
                    )}

                    {/* + New Group */}
                    <button
                      onClick={() => setShowNewGroupInput(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
                        border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
                        backgroundColor: '#f9fafb', cursor: 'pointer', textAlign: 'left',
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                    >
                      <span style={{ fontSize: 18, color: 'var(--color-primary)' }}>+</span>
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-primary)' }}>New Group</span>
                    </button>

                    {/* General Business */}
                    <button
                      onClick={() => { setWizardData(d => ({ ...d, business_name: '' })); setWizardStep(2); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
                        border: '2px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                        backgroundColor: '#fff', cursor: 'pointer', textAlign: 'left',
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                    >
                      <span style={{ fontSize: 20 }}>📋</span>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>General Business</span>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>No specific group</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Type */}
            {wizardStep === 2 && (
              <div>
                <button onClick={() => setWizardStep(wizardData.scope === 'business' ? 15 : 1)} className="btn btn-ghost" style={{ marginBottom: 16, padding: '4px 8px', fontSize: 13 }}>&larr; Back</button>
                <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 20 }}>What type of insurance?</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {Object.entries(POLICY_TYPE_CONFIG).filter(([, cfg]) => cfg.group === 'both' || cfg.group === (wizardData.scope || 'personal')).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => { setWizardData(d => ({ ...d, policy_type: key })); setWizardStep(wizardMethod === 'url' ? 4 : 3); }}
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
                  <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--color-text-secondary)' }}>
                    Upload a PDF and we&apos;ll extract the details automatically.
                  </p>
                  <p style={{ margin: '0 0 24px', fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Our AI reads your policy and organizes coverage instantly.
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

            {/* Step 4: URL Import */}
            {wizardStep === 4 && (
              <div>
                <button onClick={() => setWizardStep(2)} disabled={importingUrl || extracting} className="btn btn-ghost" style={{ marginBottom: 16, padding: '4px 8px', fontSize: 13 }}>&larr; Back</button>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: 'var(--color-text)' }}>Import from URL</h3>
                  <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--color-text-secondary)' }}>
                    Paste a link to a PDF and we&apos;ll download and extract the details.
                  </p>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://example.com/policy.pdf"
                    disabled={importingUrl || extracting}
                    style={{
                      width: '100%', padding: '12px 16px', fontSize: 15,
                      border: '2px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                      marginBottom: 16, boxSizing: 'border-box',
                    }}
                    autoFocus
                  />
                  <div>
                    <button
                      onClick={handleUrlImport}
                      disabled={!urlInput.trim() || importingUrl || extracting}
                      className="btn btn-accent"
                      style={{ padding: '14px 32px', fontSize: 15, fontWeight: 600 }}
                    >
                      {extracting ? 'Extracting...' : importingUrl ? 'Importing...' : 'Import & Extract'}
                    </button>
                  </div>

                  {(importingUrl || extracting) && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                        {extracting ? 'Reading your policy...' : 'Downloading PDF...'}
                      </div>
                      <div style={{ height: 6, backgroundColor: 'var(--color-border)', borderRadius: 3 }}>
                        <div style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: 'var(--color-accent)',
                          borderRadius: 3,
                          animation: 'pulse 1.5s ease-in-out infinite',
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
          <div role="dialog" aria-modal="true" aria-labelledby="draft-review-title" style={{
            backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', padding: 32, maxWidth: 550, width: '100%', maxHeight: '90vh', overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 id="draft-review-title" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>Review Policy Draft</h2>
              <button onClick={() => setShowDraftModal(null)} aria-label="Close dialog" style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--color-text-muted)' }}>×</button>
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
                style={{ padding: '14px 24px', fontSize: 15, color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
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
