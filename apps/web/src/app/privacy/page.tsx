'use client';

import { useRouter } from 'next/navigation';
import { APP_NAME } from '../config';

const getPrinciples = (name: string) => [
  {
    title: 'You Own Your Data',
    desc: `Your policy documents, personal information, and all data you store in ${name} belongs to you. We are a vault, not a marketplace.`,
    icon: '🔐',
  },
  {
    title: 'No Data Resale',
    desc: 'We will never sell, share, or monetize your insurance data. Your information is never shared with carriers, brokers, or third-party marketplaces.',
    icon: '🚫',
  },
  {
    title: 'No Forced Quoting',
    desc: `${name} will never push insurance quotes or try to switch your carriers. We are carrier-agnostic and work for you, not insurers.`,
    icon: '🛡️',
  },
  {
    title: 'No Carrier Bias',
    desc: 'We have no financial relationships with insurance carriers. Your data is organized objectively without any preferential treatment.',
    icon: '⚖️',
  },
  {
    title: 'Encryption & Security',
    desc: 'All data is encrypted in transit using TLS. Authentication is handled via secure JWT tokens. Your password is hashed with bcrypt and never stored in plain text.',
    icon: '🔒',
  },
  {
    title: 'Audit Trail',
    desc: `Every action in ${name} is logged. You can review who accessed your policies, when documents were uploaded, and what changes were made.`,
    icon: '📋',
  },
  {
    title: 'Granular Sharing Controls',
    desc: 'When you share policies with family, advisors, or attorneys, you control the permission level. You can revoke access at any time.',
    icon: '👥',
  },
  {
    title: 'Delete Anytime',
    desc: 'You can delete any policy, document, or your entire account at any time. When you delete data, it is permanently removed.',
    icon: '🗑️',
  },
];

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 32, paddingBottom: 20, borderBottom: '1px solid var(--color-border)' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700, color: 'var(--color-primary)' }}>
          Privacy & Security
        </h1>
        <p style={{ margin: 0, fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          {APP_NAME} is built on a simple principle: <strong>your insurance data belongs to you</strong>.
          We are a secure vault — not a marketplace, not a lead generator, not an insurance seller.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16, marginBottom: 32 }}>
        {getPrinciples(APP_NAME).map(p => (
          <div key={p.title} className="card">
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 28, flexShrink: 0 }}>{p.icon}</div>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{p.title}</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{p.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ backgroundColor: 'var(--color-primary-dark)', color: '#fff', textAlign: 'center', padding: 32 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>Your trust is our foundation</h2>
        <p style={{ margin: '0 0 16px', fontSize: 14, opacity: 0.85, lineHeight: 1.6 }}>
          {APP_NAME} exists to serve you — not advertisers, not carriers, not data brokers.
          If you ever have questions about how your data is handled, reach out anytime.
        </p>
        <button onClick={() => router.push('/policies')} className="btn" style={{ backgroundColor: 'var(--color-accent)', color: '#fff', padding: '10px 24px' }}>
          Back to Policies
        </button>
      </div>
    </div>
  );
}
