'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { auditApi, AuditLogEntry, AuditLogPage } from '../../../lib/api';

const actionColors: Record<string, { bg: string; fg: string }> = {
  created: { bg: '#d1fae5', fg: '#065f46' },
  updated: { bg: '#dbeafe', fg: '#1e40af' },
  deleted: { bg: '#fee2e2', fg: '#991b1b' },
  uploaded: { bg: '#e0e7ff', fg: '#3730a3' },
  confirmed: { bg: '#fef3c7', fg: '#92400e' },
  shared: { bg: '#ede9fe', fg: '#5b21b6' },
};

export default function AuditPage() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AuditLogPage | null>(null);
  const [error, setError] = useState('');
  const limit = 20;

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    load();
  }, [token, page]);

  const load = async () => {
    try {
      setData(await auditApi.list(page, limit));
    } catch (err: any) {
      if (err.status === 401) { logout(); router.replace('/login'); return; }
      setError(err.message);
    }
  };

  if (!token) return null;

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <nav style={{ marginBottom: 16, fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => router.push('/policies')} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 13, padding: 0 }}>Policies</button>
        <span>/</span>
        <span style={{ color: 'var(--color-text)' }}>Audit Log</span>
      </nav>

      <h1 style={{ margin: '0 0 24px', fontSize: 22 }}>Audit Log</h1>

      {error && <div style={{ padding: 12, marginBottom: 16, backgroundColor: '#fee', color: '#c00', borderRadius: 4 }}>{error}</div>}

      {!data ? (
        <p>Loading...</p>
      ) : data.items.length === 0 ? (
        <p style={{ color: '#999' }}>No audit entries yet.</p>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 8 }}>
            {data.items.map((entry: AuditLogEntry) => {
              const ac = actionColors[entry.action] || { bg: '#f0f0f0', fg: '#555' };
              return (
                <div key={entry.id} style={{ padding: 12, backgroundColor: '#fff', borderRadius: 6, border: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, backgroundColor: ac.bg, color: ac.fg, marginRight: 8 }}>{entry.action}</span>
                    <span style={{ fontSize: 14 }}>{entry.entity_type} #{entry.entity_id}</span>
                    {entry.details && <span style={{ marginLeft: 8, fontSize: 13, color: '#666' }}>- {entry.details}</span>}
                  </div>
                  <span style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap' }}>{entry.created_at}</span>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 4, cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.5 : 1, backgroundColor: '#fff' }}>
                Previous
              </button>
              <span style={{ padding: '8px 0', fontSize: 14 }}>Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 4, cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.5 : 1, backgroundColor: '#fff' }}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
