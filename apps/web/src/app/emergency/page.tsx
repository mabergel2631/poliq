'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { policiesApi, contactsApi, documentsApi, policyDetailsApi, Policy, Contact, DocMeta, PolicyDetail } from '../../../lib/api';
import { PolicyListSkeleton } from '../components/Skeleton';

type PolicyEmergencyData = {
  policy: Policy;
  contacts: Contact[];
  docs: DocMeta[];
  details: PolicyDetail[];
};

export default function EmergencyPage() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<PolicyEmergencyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    loadAll();
  }, [token]);

  const loadAll = async () => {
    try {
      const policies = await policiesApi.list();
      const all = await Promise.all(
        policies.map(async (p) => {
          const [contacts, docs, details] = await Promise.all([
            contactsApi.list(p.id).catch(() => []),
            documentsApi.list(p.id).catch(() => []),
            policyDetailsApi.list(p.id).catch(() => []),
          ]);
          return { policy: p, contacts, docs, details };
        })
      );
      setData(all);
      if (all.length > 0) setExpandedId(all[0].policy.id);
    } catch (err: any) {
      if (err.status === 401) { logout(); router.replace('/login'); }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const getClaimsContact = (contacts: Contact[]) =>
    contacts.find(c => c.role === 'claims') || contacts.find(c => c.role === 'customer_service');

  const getIdCard = (docs: DocMeta[]) =>
    docs.find(d => d.doc_type === 'insurance_card');

  const getDecPage = (docs: DocMeta[]) =>
    docs.find(d => d.doc_type === 'policy');

  const getDetail = (details: PolicyDetail[], field: string) =>
    details.find(d => d.field_name.toLowerCase() === field.toLowerCase())?.field_value;

  const handleDownload = async (docId: number) => {
    try {
      const { download_url } = await documentsApi.download(docId);
      window.open(download_url, '_blank');
    } catch {}
  };

  if (!token) return null;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      {/* Emergency Header */}
      <div style={{
        background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
        color: '#fff',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        marginBottom: 24,
      }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700 }}>Emergency Access</h1>
        <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>
          Quick access to critical policy information. Tap any field to copy it.
        </p>
      </div>

      {copied && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          padding: '10px 16px', backgroundColor: 'var(--color-success-bg)',
          border: '1px solid #6ee7b7', borderRadius: 'var(--radius-md)',
          color: 'var(--color-success)', fontSize: 14, fontWeight: 500,
          boxShadow: 'var(--shadow-md)',
        }}>
          Copied: {copied}
        </div>
      )}

      {loading ? (
        <PolicyListSkeleton />
      ) : data.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚨</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>No policies yet</h3>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>Add your insurance policies to access them quickly in an emergency.</p>
          <button onClick={() => router.push('/policies')} className="btn btn-primary">Go to Policies</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.map(({ policy: p, contacts, docs, details }) => {
            const expanded = expandedId === p.id;
            const claimsContact = getClaimsContact(contacts);
            const idCard = getIdCard(docs);
            const decPage = getDecPage(docs);
            const vin = getDetail(details, 'VIN') || getDetail(details, 'vin');
            const address = getDetail(details, 'property_address') || getDetail(details, 'address');

            return (
              <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Policy header - always visible */}
                <button
                  onClick={() => setExpandedId(expanded ? null : p.id)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 20px', border: 'none', backgroundColor: expanded ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: expanded ? '#fff' : 'var(--color-text)', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{p.nickname || p.carrier}</div>
                    <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>
                      {p.policy_type} {p.nickname ? `- ${p.carrier}` : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 20, fontWeight: 300 }}>{expanded ? '−' : '+'}</span>
                </button>

                {expanded && (
                  <div style={{ padding: '16px 20px' }}>
                    {/* Quick-copy fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                      <CopyField
                        label="Policy #"
                        value={p.policy_number}
                        onCopy={() => copyToClipboard(p.policy_number, 'Policy #')}
                      />
                      {claimsContact?.phone && (
                        <CopyField
                          label="Claims Phone"
                          value={claimsContact.phone}
                          onCopy={() => copyToClipboard(claimsContact.phone!, 'Claims Phone')}
                          isPhone
                        />
                      )}
                      {p.coverage_amount && (
                        <CopyField
                          label="Coverage"
                          value={`$${p.coverage_amount.toLocaleString()}`}
                          onCopy={() => copyToClipboard(String(p.coverage_amount), 'Coverage')}
                        />
                      )}
                      {p.deductible && (
                        <CopyField
                          label="Deductible"
                          value={`$${p.deductible.toLocaleString()}`}
                          onCopy={() => copyToClipboard(String(p.deductible), 'Deductible')}
                        />
                      )}
                      {vin && (
                        <CopyField
                          label="VIN"
                          value={vin}
                          onCopy={() => copyToClipboard(vin, 'VIN')}
                        />
                      )}
                      {address && (
                        <CopyField
                          label="Property Address"
                          value={address}
                          onCopy={() => copyToClipboard(address, 'Address')}
                        />
                      )}
                      <CopyField
                        label="Carrier"
                        value={p.carrier}
                        onCopy={() => copyToClipboard(p.carrier, 'Carrier')}
                      />
                      {p.renewal_date && (
                        <CopyField
                          label="Renewal Date"
                          value={p.renewal_date}
                          onCopy={() => copyToClipboard(p.renewal_date!, 'Renewal Date')}
                        />
                      )}
                    </div>

                    {/* Quick actions */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                      {claimsContact?.phone && (
                        <a
                          href={`tel:${claimsContact.phone}`}
                          className="btn btn-accent"
                          style={{ textDecoration: 'none', padding: '10px 16px', fontSize: 14, fontWeight: 600 }}
                        >
                          Call Claims
                        </a>
                      )}
                      {idCard && (
                        <button onClick={() => handleDownload(idCard.id)} className="btn btn-primary" style={{ padding: '10px 16px' }}>
                          ID Card
                        </button>
                      )}
                      {decPage && (
                        <button onClick={() => handleDownload(decPage.id)} className="btn btn-primary" style={{ padding: '10px 16px' }}>
                          Declarations
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/policies/${p.id}`)}
                        className="btn btn-outline"
                        style={{ padding: '10px 16px' }}
                      >
                        Full Details
                      </button>
                    </div>

                    {/* All contacts */}
                    {contacts.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Contacts</div>
                        <div style={{ display: 'grid', gap: 6 }}>
                          {contacts.map(c => (
                            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                              <div>
                                <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 10, color: 'var(--color-text-muted)', marginRight: 8 }}>{c.role}</span>
                                <span style={{ fontWeight: 500 }}>{c.name || c.company || 'Unknown'}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                {c.phone && (
                                  <a href={`tel:${c.phone}`} style={{ color: 'var(--color-accent)', fontWeight: 500, textDecoration: 'none' }}>
                                    {c.phone}
                                  </a>
                                )}
                                {c.email && (
                                  <a href={`mailto:${c.email}`} style={{ color: 'var(--color-info)', textDecoration: 'none' }}>
                                    Email
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CopyField({ label, value, onCopy, isPhone }: { label: string; value: string; onCopy: () => void; isPhone?: boolean }) {
  return (
    <button
      onClick={onCopy}
      style={{
        display: 'block',
        width: '100%',
        padding: '10px 12px',
        backgroundColor: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: isPhone ? 'var(--color-accent)' : 'var(--color-text)', fontFamily: isPhone ? 'var(--font-sans)' : 'monospace' }}>{value}</div>
    </button>
  );
}
