'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { renewalsApi, RenewalSummaryResult, RenewalPolicySummary, RenewalChange } from '../../../lib/api';
import { formatDate, formatCurrency } from '../../../lib/format';
import EmptyState from '../components/EmptyState';
import { getPolicyTypeDisplay, ALERT_SEVERITY_CONFIG } from '../constants';

const fieldLabels: Record<string, string> = {
  premium_amount: 'Premium',
  coverage_amount: 'Coverage',
  deductible: 'Deductible',
  carrier: 'Carrier',
  policy_number: 'Policy Number',
  policy_type: 'Policy Type',
  renewal_date: 'Renewal Date',
  scope: 'Scope',
};

function formatFieldValue(key: string, value: string | null): string {
  if (!value) return 'N/A';
  if (['premium_amount', 'coverage_amount', 'deductible'].includes(key)) {
    const num = parseInt(value, 10);
    if (!isNaN(num)) return `$${num.toLocaleString()}`;
  }
  return value;
}

function getDaysColor(days: number): { bg: string; fg: string } {
  if (days < 14) return { bg: 'var(--color-danger-light)', fg: 'var(--color-danger-dark)' };
  if (days < 30) return { bg: 'var(--color-warning-light)', fg: 'var(--color-warning-dark)' };
  return { bg: 'var(--color-info-light)', fg: 'var(--color-info-dark)' };
}

function ChangeRow({ change }: { change: RenewalChange }) {
  const sev = ALERT_SEVERITY_CONFIG[change.severity] || ALERT_SEVERITY_CONFIG.info;
  const label = fieldLabels[change.field_key] || change.field_key;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 0',
      borderBottom: '1px solid var(--color-border)',
      fontSize: 14,
      flexWrap: 'wrap',
    }}>
      <span style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: sev.bg,
        color: sev.fg,
        fontSize: 11,
        fontWeight: 600,
      }}>
        {sev.icon} {sev.label}
      </span>
      <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{label}</span>
      <span style={{ color: 'var(--color-text-muted)' }}>
        {formatFieldValue(change.field_key, change.old_value)}
      </span>
      <span style={{ color: 'var(--color-text-muted)' }}>&rarr;</span>
      <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
        {formatFieldValue(change.field_key, change.new_value)}
      </span>
    </div>
  );
}

function PolicyCard({ policy }: { policy: RenewalPolicySummary }) {
  const router = useRouter();
  const ptDisplay = getPolicyTypeDisplay(policy.policy_type);
  const daysColor = getDaysColor(policy.days_until_renewal);
  const hasChanges = policy.changes.length > 0;

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 20,
      marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{ptDisplay.icon}</span>
          <div>
            <button
              onClick={() => router.push(`/policies/${policy.id}`)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 16, fontWeight: 600, color: 'var(--color-text)', textAlign: 'left' }}
            >
              {policy.carrier}
              {policy.nickname && <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> &middot; {policy.nickname}</span>}
            </button>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {ptDisplay.label} &middot; {policy.policy_number}
            </div>
          </div>
        </div>
        <span style={{
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: daysColor.bg,
          color: daysColor.fg,
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}>
          Renews in {policy.days_until_renewal} day{policy.days_until_renewal !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Key figures */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16, fontSize: 13 }}>
        <div>
          <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>Renewal Date</div>
          <div style={{ fontWeight: 600 }}>{formatDate(policy.renewal_date)}</div>
        </div>
        {policy.coverage_amount != null && (
          <div>
            <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>Coverage</div>
            <div style={{ fontWeight: 600 }}>{formatCurrency(policy.coverage_amount)}</div>
          </div>
        )}
        {policy.deductible != null && (
          <div>
            <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>Deductible</div>
            <div style={{ fontWeight: 600 }}>{formatCurrency(policy.deductible)}</div>
          </div>
        )}
        {policy.premium_amount != null && (
          <div>
            <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>Premium</div>
            <div style={{ fontWeight: 600 }}>{formatCurrency(policy.premium_amount)}</div>
          </div>
        )}
      </div>

      {/* Changes section */}
      {hasChanges ? (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
            What changed ({policy.changes.length})
          </div>
          {policy.changes.map((ch) => (
            <ChangeRow key={ch.id} change={ch} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-success-dark)', fontSize: 14 }}>
          <span style={{ fontSize: 16 }}>&#10003;</span>
          No changes detected
        </div>
      )}

      {/* Agent contact */}
      {policy.agent_name && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)', fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Agent: <strong style={{ color: 'var(--color-text)' }}>{policy.agent_name}</strong></span>
          {policy.agent_phone && (
            <a href={`tel:${policy.agent_phone}`} style={{ color: 'var(--color-accent)' }}>
              {policy.agent_phone}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function RenewalsPage() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<RenewalSummaryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    load();
  }, [token]);

  const load = async () => {
    try {
      setLoading(true);
      setData(await renewalsApi.summary());
    } catch (err: any) {
      if (err.status === 401) { logout(); router.replace('/login'); return; }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div style={{ padding: '24px 24px 48px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700 }}>Nothing changes without you knowing</h1>
        {data && (
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-muted)' }}>
            {data.total_renewing} {data.total_renewing === 1 ? 'policy' : 'policies'} renewing in the next 90 days — every change explained
          </p>
        )}
      </div>

      {error && (
        <div style={{ padding: 12, backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger-dark)', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>Loading...</div>
      )}

      {!loading && data && data.total_renewing === 0 && (
        <EmptyState
          icon="&#10003;"
          title="No upcoming renewals"
          subtitle="When your policies renew, Covrabl will show you exactly what changed."
        />
      )}

      {!loading && data && data.total_renewing > 0 && (
        <>
          {/* Stats bar */}
          <div style={{
            display: 'flex',
            gap: 16,
            marginBottom: 24,
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: 140, padding: 16, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text)' }}>{data.total_renewing}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Total Renewing</div>
            </div>
            <div style={{ flex: 1, minWidth: 140, padding: 16, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: data.total_with_changes > 0 ? 'var(--color-warning-dark)' : 'var(--color-success-dark)' }}>
                {data.total_with_changes}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>With Changes</div>
            </div>
            <div style={{ flex: 1, minWidth: 140, padding: 16, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text)' }}>
                {data.policies[0]?.days_until_renewal ?? '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Days to Next Renewal</div>
            </div>
          </div>

          {/* Policy cards */}
          {data.policies.map((p) => (
            <PolicyCard key={p.id} policy={p} />
          ))}
        </>
      )}
    </div>
  );
}
