'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../lib/auth';
import { compareApi, PolicyBundle } from '../../../../lib/api';
import BackButton from '../../components/BackButton';

function CompareContent() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const idsParam = searchParams.get('ids') || '';
  const ids = idsParam.split(',').map(Number).filter(Boolean);

  const [bundles, setBundles] = useState<PolicyBundle[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    if (ids.length < 2) { setError('Select at least 2 policies to compare.'); return; }
    load();
  }, [token, idsParam]);

  const load = async () => {
    try {
      setBundles(await compareApi.compare(ids));
    } catch (err: any) {
      if (err.status === 401) { logout(); router.replace('/login'); return; }
      setError(err.message);
    }
  };

  if (!token) return null;

  const fields: { label: string; key: string; fmt?: (v: any) => string }[] = [
    { label: 'Carrier', key: 'carrier' },
    { label: 'Type', key: 'policy_type' },
    { label: 'Scope', key: 'scope' },
    { label: 'Policy #', key: 'policy_number' },
    { label: 'Nickname', key: 'nickname' },
    { label: 'Coverage', key: 'coverage_amount', fmt: v => v != null ? `$${v.toLocaleString()}` : '-' },
    { label: 'Deductible', key: 'deductible', fmt: v => v != null ? `$${v.toLocaleString()}` : '-' },
    { label: 'Renewal Date', key: 'renewal_date', fmt: v => v || '-' },
  ];

  const allValues = (key: string) => bundles.map(b => JSON.stringify((b.policy as any)[key]));
  const isDiff = (key: string) => { const vals = allValues(key); return vals.length > 1 && new Set(vals).size > 1; };

  const colWidth = bundles.length > 0 ? `${100 / (bundles.length + 1)}%` : '50%';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <BackButton href="/policies" label="Compare" parentLabel="Policies" />

      <h1 style={{ margin: '0 0 24px', fontSize: 22 }}>Compare Policies</h1>

      {error && <div style={{ padding: 12, marginBottom: 16, backgroundColor: '#fee', color: '#c00', borderRadius: 4 }}>{error}</div>}

      {bundles.length === 0 && !error ? (
        <p>Loading...</p>
      ) : bundles.length > 0 && (
        <>
          {/* Main fields comparison */}
          <div style={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #ddd', overflow: 'hidden', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: 10, textAlign: 'left', width: colWidth }}>Field</th>
                  {bundles.map(b => (
                    <th key={b.policy.id} style={{ padding: 10, textAlign: 'left', width: colWidth }}>
                      {b.policy.nickname || `${b.policy.carrier} - ${b.policy.policy_type}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fields.map(f => {
                  const diff = isDiff(f.key);
                  return (
                    <tr key={f.key} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: diff ? '#fefce8' : 'transparent' }}>
                      <td style={{ padding: 10, fontWeight: 500, color: '#555' }}>{f.label}</td>
                      {bundles.map(b => {
                        const val = (b.policy as any)[f.key];
                        return (
                          <td key={b.policy.id} style={{ padding: 10 }}>
                            {f.fmt ? f.fmt(val) : (val ?? '-')}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Coverage items */}
          <div style={{ backgroundColor: '#fff', padding: 24, borderRadius: 8, border: '1px solid #ddd', marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Coverage Items</h2>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${bundles.length}, 1fr)`, gap: 16 }}>
              {bundles.map(b => (
                <div key={b.policy.id}>
                  <h3 style={{ fontSize: 14, margin: '0 0 8px', color: '#555' }}>{b.policy.nickname || b.policy.carrier}</h3>
                  {b.coverage_items.length === 0 ? <p style={{ color: '#999', fontSize: 13 }}>None</p> : (
                    b.coverage_items.map(ci => (
                      <div key={ci.id} style={{ padding: 6, marginBottom: 4, fontSize: 13, backgroundColor: ci.item_type === 'inclusion' ? '#f0fdf4' : '#fef2f2', borderRadius: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: ci.item_type === 'inclusion' ? '#166534' : '#991b1b', marginRight: 4 }}>{ci.item_type}</span>
                        {ci.description}
                        {ci.limit && <span style={{ color: '#666' }}> ({ci.limit})</span>}
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Premiums */}
          <div style={{ backgroundColor: '#fff', padding: 24, borderRadius: 8, border: '1px solid #ddd' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Premiums</h2>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${bundles.length}, 1fr)`, gap: 16 }}>
              {bundles.map(b => (
                <div key={b.policy.id}>
                  <h3 style={{ fontSize: 14, margin: '0 0 8px', color: '#555' }}>{b.policy.nickname || b.policy.carrier}</h3>
                  {b.premiums.length === 0 ? <p style={{ color: '#999', fontSize: 13 }}>None</p> : (
                    b.premiums.map(pr => (
                      <div key={pr.id} style={{ padding: 6, marginBottom: 4, fontSize: 13, backgroundColor: '#fafafa', borderRadius: 4 }}>
                        ${(pr.amount / 100).toFixed(2)} / {pr.frequency.replace('_', '-')} - Due: {pr.due_date}
                        {pr.paid_date && <span style={{ color: '#059669', marginLeft: 4 }}>(paid)</span>}
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
      <CompareContent />
    </Suspense>
  );
}
