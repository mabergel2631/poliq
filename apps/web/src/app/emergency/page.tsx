'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { policiesApi, contactsApi, documentsApi, policyDetailsApi, iceApi, Policy, Contact, DocMeta, PolicyDetail, EmergencyCardData } from '../../../lib/api';
import { PolicyListSkeleton } from '../components/Skeleton';
import { APP_NAME } from '../config';

// Emergency Playbook - step-by-step instructions by policy type
const EMERGENCY_PLAYBOOK: Record<string, { title: string; steps: string[]; tip?: string }> = {
  auto: {
    title: '🚗 Auto Accident Checklist',
    steps: [
      'Check for injuries - call 911 if needed',
      'Move to safety if possible',
      'Take photos of all vehicles, damage, license plates, and the scene',
      'Exchange info: name, phone, insurance, license plate',
      'Get witness contact info if available',
      'Do NOT admit fault or apologize',
      'File police report if required by your state',
      'Call your claims line (below)',
    ],
    tip: 'Most insurers have a 24-48 hour reporting window. Report even minor incidents.',
  },
  home: {
    title: '🏠 Home Damage Checklist',
    steps: [
      'Ensure everyone is safe - evacuate if necessary',
      'Prevent further damage (tarp roof, turn off water, etc.)',
      'Document everything with photos and video BEFORE cleanup',
      'Make a detailed inventory of damaged items',
      'Save receipts for emergency repairs and temporary housing',
      'Do NOT throw away damaged items until adjuster sees them',
      'Call your claims line (below)',
    ],
    tip: 'Keep all receipts. Emergency repairs and temporary living expenses may be covered.',
  },
  health: {
    title: '🏥 Medical Emergency Checklist',
    steps: [
      'Get emergency care first - authorization can wait',
      'For non-emergencies: call to verify coverage before treatment',
      'Know your plan: in-network vs out-of-network costs',
      'Request itemized bills and review for errors',
      'Appeal denied claims - many are overturned',
    ],
    tip: 'Emergency care cannot be denied. Focus on treatment first, paperwork later.',
  },
  life: {
    title: '❤️ Life Insurance Claim Guide',
    steps: [
      'Obtain certified copies of death certificate (you\'ll need 5-10)',
      'Locate the policy document or contact the carrier',
      'Notify the insurance company of the death',
      'Complete claim forms (carrier will provide)',
      'Submit: claim form, death certificate, policy (if available)',
      'Payout typically within 30-60 days of complete submission',
    ],
    tip: 'Beneficiaries should file claims. Proceeds are generally tax-free.',
  },
  liability: {
    title: '🛡️ Liability Claim Checklist',
    steps: [
      'Do NOT admit fault or make statements',
      'Document the incident with photos and notes',
      'Gather witness information',
      'Report to your insurer immediately',
      'Forward any legal documents to your insurer right away',
      'Let your insurer handle communications',
    ],
    tip: 'Your insurer will provide legal defense if you\'re sued. Report early.',
  },
  umbrella: {
    title: '☂️ Umbrella Policy Claim',
    steps: [
      'Report to your primary policy first (auto/home)',
      'Notify your umbrella carrier of potential large claims',
      'Umbrella kicks in when primary limits are exhausted',
      'Keep all documentation from the primary claim',
    ],
    tip: 'Umbrella coverage activates after your auto/home limits are exceeded.',
  },
  renters: {
    title: '🏢 Renters Insurance Checklist',
    steps: [
      'Document damage with photos and video',
      'Make a list of damaged/stolen items with values',
      'Report theft to police and get a report number',
      'Notify your landlord of the incident',
      'Call your claims line (below)',
    ],
    tip: 'Renters insurance covers your belongings, not the building structure.',
  },
};

const DEFAULT_PLAYBOOK = {
  title: '📋 General Claims Checklist',
  steps: [
    'Document the incident with photos and notes',
    'Gather any relevant receipts or records',
    'Report the claim promptly',
    'Keep copies of all correspondence',
    'Follow up if you don\'t hear back within a week',
  ],
  tip: 'Report claims promptly. Delays can complicate the process.',
};

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

  // ICE Card state
  const [iceCard, setIceCard] = useState<EmergencyCardData | null>(null);
  const [showIceSetup, setShowIceSetup] = useState(false);
  const [iceForm, setIceForm] = useState({
    holder_name: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    pin: '',
    include_coverage_amounts: true,
    include_deductibles: true,
  });
  const [iceSaving, setIceSaving] = useState(false);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    loadAll();
  }, [token]);

  const loadAll = async () => {
    try {
      const [policies, iceResult] = await Promise.all([
        policiesApi.list(),
        iceApi.get().catch(() => ({ card: null })),
      ]);

      setIceCard(iceResult.card);

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

  // ICE Card handlers
  const handleCreateIceCard = async () => {
    if (!iceForm.holder_name.trim()) return;
    setIceSaving(true);
    try {
      const result = await iceApi.create({
        holder_name: iceForm.holder_name,
        emergency_contact_name: iceForm.emergency_contact_name || undefined,
        emergency_contact_phone: iceForm.emergency_contact_phone || undefined,
        pin: iceForm.pin || undefined,
        include_coverage_amounts: iceForm.include_coverage_amounts,
        include_deductibles: iceForm.include_deductibles,
      });
      const { card } = await iceApi.get();
      setIceCard(card);
      setShowIceSetup(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIceSaving(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!confirm('This will invalidate the old link. Anyone with the old link will no longer be able to access your emergency card. Continue?')) return;
    try {
      await iceApi.regenerate();
      const { card } = await iceApi.get();
      setIceCard(card);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleIceCard = async () => {
    if (!iceCard) return;
    try {
      await iceApi.update({ is_active: !iceCard.is_active });
      const { card } = await iceApi.get();
      setIceCard(card);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteIceCard = async () => {
    if (!confirm('Delete your emergency card? This cannot be undone.')) return;
    try {
      await iceApi.delete();
      setIceCard(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getShareUrl = () => {
    if (!iceCard) return '';
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return `${base}/ice/${iceCard.access_code}`;
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

      {/* ICE Card Section */}
      <div className="card" style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#fef2f2',
          borderBottom: '1px solid #fecaca',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#991b1b' }}>
              🆘 ICE Card (In Case of Emergency)
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#b91c1c' }}>
              A shareable link for family members to access your insurance info without logging in
            </p>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {!iceCard && !showIceSetup && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                Create an emergency card that family members can access if something happens to you.
              </p>
              <button
                onClick={() => setShowIceSetup(true)}
                className="btn btn-accent"
                style={{ padding: '12px 24px', fontSize: 15, fontWeight: 600 }}
              >
                Create Emergency Card
              </button>
            </div>
          )}

          {showIceSetup && !iceCard && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                  Your Name (shown on card) *
                </label>
                <input
                  type="text"
                  value={iceForm.holder_name}
                  onChange={(e) => setIceForm({ ...iceForm, holder_name: e.target.value })}
                  placeholder="e.g., John Smith"
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={iceForm.emergency_contact_name}
                  onChange={(e) => setIceForm({ ...iceForm, emergency_contact_name: e.target.value })}
                  placeholder="e.g., Jane Smith (Spouse)"
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  value={iceForm.emergency_contact_phone}
                  onChange={(e) => setIceForm({ ...iceForm, emergency_contact_phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                  PIN Protection (optional)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={iceForm.pin}
                  onChange={(e) => setIceForm({ ...iceForm, pin: e.target.value.replace(/\D/g, '') })}
                  placeholder="4-6 digit PIN"
                  className="form-input"
                  style={{ width: 150 }}
                />
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  If set, viewers must enter this PIN to see your card
                </p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={iceForm.include_coverage_amounts}
                    onChange={(e) => setIceForm({ ...iceForm, include_coverage_amounts: e.target.checked })}
                  />
                  Show coverage amounts
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={iceForm.include_deductibles}
                    onChange={(e) => setIceForm({ ...iceForm, include_deductibles: e.target.checked })}
                  />
                  Show deductibles
                </label>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleCreateIceCard}
                  disabled={!iceForm.holder_name.trim() || iceSaving}
                  className="btn btn-accent"
                  style={{ padding: '10px 20px' }}
                >
                  {iceSaving ? 'Creating...' : 'Create Card'}
                </button>
                <button
                  onClick={() => setShowIceSetup(false)}
                  className="btn btn-outline"
                  style={{ padding: '10px 20px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {iceCard && (
            <div>
              <div style={{
                padding: 16,
                backgroundColor: iceCard.is_active ? '#f0fdf4' : '#f3f4f6',
                borderRadius: 8,
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: iceCard.is_active ? '#dcfce7' : '#e5e7eb',
                      color: iceCard.is_active ? '#166534' : '#6b7280',
                    }}>
                      {iceCard.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    {iceCard.has_pin && (
                      <span style={{
                        marginLeft: 8,
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: '#dbeafe',
                        color: '#1d4ed8',
                      }}>
                        🔐 PIN Protected
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    For: {iceCard.holder_name}
                  </span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                    Shareable Link
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      readOnly
                      value={getShareUrl()}
                      className="form-input"
                      style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}
                    />
                    <button
                      onClick={() => copyToClipboard(getShareUrl(), 'Emergency Card Link')}
                      className="btn btn-primary"
                      style={{ padding: '8px 16px' }}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {iceCard.emergency_contact_name && (
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '8px 0 0' }}>
                    Emergency Contact: {iceCard.emergency_contact_name}
                    {iceCard.emergency_contact_phone && ` - ${iceCard.emergency_contact_phone}`}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={() => window.open(getShareUrl(), '_blank')}
                  className="btn btn-outline"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                >
                  Preview Card
                </button>
                <button
                  onClick={handleToggleIceCard}
                  className="btn btn-outline"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                >
                  {iceCard.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={handleRegenerateCode}
                  className="btn btn-outline"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                >
                  New Link
                </button>
                <button
                  onClick={handleDeleteIceCard}
                  className="btn btn-outline"
                  style={{ padding: '8px 16px', fontSize: 13, color: '#dc2626', borderColor: '#dc2626' }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Policy List */}
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
                    {/* Emergency Playbook */}
                    {(() => {
                      const playbook = EMERGENCY_PLAYBOOK[p.policy_type.toLowerCase()] || DEFAULT_PLAYBOOK;
                      return (
                        <div style={{
                          backgroundColor: '#fef3c7',
                          border: '1px solid #fcd34d',
                          borderRadius: 'var(--radius-md)',
                          padding: 16,
                          marginBottom: 16,
                        }}>
                          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#92400e' }}>
                            {playbook.title}
                          </div>
                          <ol style={{
                            margin: 0,
                            paddingLeft: 20,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}>
                            {playbook.steps.map((step, i) => (
                              <li key={i} style={{ fontSize: 13, color: '#78350f', lineHeight: 1.4 }}>
                                {step}
                              </li>
                            ))}
                          </ol>
                          {playbook.tip && (
                            <div style={{
                              marginTop: 12,
                              paddingTop: 12,
                              borderTop: '1px solid #fcd34d',
                              fontSize: 12,
                              color: '#92400e',
                              fontStyle: 'italic',
                            }}>
                              💡 {playbook.tip}
                            </div>
                          )}
                        </div>
                      );
                    })()}

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
                          📞 Call Claims
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
