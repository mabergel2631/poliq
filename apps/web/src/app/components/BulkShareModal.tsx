'use client';

import { useState, useEffect, useRef } from 'react';
import { sharingApi, Policy, BulkShareCreate } from '../../../lib/api';
import { POLICY_TYPE_CONFIG } from '../constants';

type Props = {
  open: boolean;
  policies: Policy[];
  onClose: () => void;
  onSuccess: (created: number, skipped: number) => void;
};

export default function BulkShareModal({ open, policies, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<'all' | 'select'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [roleLabel, setRoleLabel] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setMode('all');
    setSelectedIds(new Set());
    setEmail('');
    setPermission('view');
    setRoleLabel('');
    setExpiresAt('');
    setError('');
    setSubmitting(false);
    setTimeout(() => emailRef.current?.focus(), 50);
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  if (!open) return null;

  const policyIds = mode === 'all' ? policies.map(p => p.id) : Array.from(selectedIds);
  const policyCount = policyIds.length;
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canContinue = isValidEmail && policyCount > 0;

  const togglePolicy = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload: BulkShareCreate = {
        policy_ids: policyIds,
        shared_with_email: email,
        permission,
        role_label: roleLabel || null,
        expires_at: expiresAt || null,
      };
      const result = await sharingApi.shareBulk(payload);
      onSuccess(result.created, result.skipped);
    } catch (err: any) {
      setError(err.message || 'Failed to share policies');
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          backgroundColor: 'rgba(0,0,0,0.4)',
        }}
        onMouseDown={onClose}
      />
      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', zIndex: 10001,
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '90%', maxWidth: 500,
          backgroundColor: '#fff',
          borderRadius: 'var(--radius-lg)',
          padding: 28,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          maxHeight: '90vh', overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
            {step === 1 ? 'Share Access' : 'Confirm Sharing'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--color-text-muted)', lineHeight: 1 }}
          >
            &times;
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', marginBottom: 16, backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger-dark)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* ── Step 1: Form ── */}
        {step === 1 && (
          <div>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => setMode('all')}
                style={{
                  flex: 1, padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: `2px solid ${mode === 'all' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: mode === 'all' ? 'var(--color-primary-light, #eff6ff)' : '#fff',
                  color: mode === 'all' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                }}
              >
                All Policies
              </button>
              <button
                onClick={() => setMode('select')}
                style={{
                  flex: 1, padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: `2px solid ${mode === 'select' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: mode === 'select' ? 'var(--color-primary-light, #eff6ff)' : '#fff',
                  color: mode === 'select' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                }}
              >
                Select Specific
              </button>
            </div>

            {/* All policies info banner */}
            {mode === 'all' && (
              <div style={{ padding: '10px 14px', marginBottom: 16, backgroundColor: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                All {policies.length} active polic{policies.length === 1 ? 'y' : 'ies'} will be shared.
              </div>
            )}

            {/* Policy checklist */}
            {mode === 'select' && (
              <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                {policies.map(p => (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                      backgroundColor: selectedIds.has(p.id) ? '#f0f9ff' : '#fff',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => togglePolicy(p.id)}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 16 }}>{POLICY_TYPE_CONFIG[p.policy_type]?.icon || '📋'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{p.nickname || p.carrier}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{p.policy_number}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {mode === 'select' && (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                {selectedIds.size} of {policies.length} selected
              </div>
            )}

            {/* Email */}
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Recipient email</span>
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="person@example.com"
                style={{
                  width: '100%', padding: '10px 14px', fontSize: 14,
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                  boxSizing: 'border-box',
                }}
              />
            </label>

            {/* Permission */}
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Permission</span>
              <select
                value={permission}
                onChange={e => setPermission(e.target.value as 'view' | 'edit')}
                style={{
                  width: '100%', padding: '10px 14px', fontSize: 14,
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                  boxSizing: 'border-box', backgroundColor: '#fff',
                }}
              >
                <option value="view">View only</option>
                <option value="edit">Edit</option>
              </select>
            </label>

            {/* Role label */}
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Role (optional)</span>
              <select
                value={roleLabel}
                onChange={e => setRoleLabel(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', fontSize: 14,
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                  boxSizing: 'border-box', backgroundColor: '#fff',
                }}
              >
                <option value="">None</option>
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
                <option value="cpa">CPA</option>
                <option value="attorney">Attorney</option>
                <option value="caregiver">Caregiver</option>
                <option value="broker">Broker</option>
                <option value="other">Other</option>
              </select>
            </label>

            {/* Expiration */}
            <label style={{ display: 'block', marginBottom: 20 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Expires (optional)</span>
              <input
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', fontSize: 14,
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                  boxSizing: 'border-box',
                }}
              />
            </label>

            <button
              onClick={() => setStep(2)}
              disabled={!canContinue}
              style={{
                width: '100%', padding: '12px 24px', fontSize: 15, fontWeight: 600,
                backgroundColor: canContinue ? 'var(--color-primary)' : 'var(--color-border)',
                color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
                cursor: canContinue ? 'pointer' : 'not-allowed',
              }}
            >
              Continue
            </button>
          </div>
        )}

        {/* ── Step 2: Confirm ── */}
        {step === 2 && (
          <div>
            <div style={{ padding: '16px 18px', marginBottom: 16, backgroundColor: '#f9fafb', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                Share {policyCount} polic{policyCount === 1 ? 'y' : 'ies'} with {email}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {permission === 'view' ? 'View' : 'Edit'} access
                {roleLabel && ` \u00b7 ${roleLabel}`}
                {expiresAt && ` \u00b7 expires ${expiresAt}`}
              </div>
            </div>

            <div style={{ padding: '12px 16px', marginBottom: 20, backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 'var(--radius-sm)', fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
              This will create {policyCount} sharing invitation{policyCount === 1 ? '' : 's'}. The recipient must accept each share to gain access.
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setStep(1)}
                disabled={submitting}
                style={{
                  padding: '10px 20px', fontSize: 14, fontWeight: 500,
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                  backgroundColor: '#fff', color: 'var(--color-text)', cursor: 'pointer',
                }}
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  flex: 1, padding: '12px 24px', fontSize: 15, fontWeight: 600,
                  backgroundColor: 'var(--color-primary)', color: '#fff',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Sharing...' : 'Share Now'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
