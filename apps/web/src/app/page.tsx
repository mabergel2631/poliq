'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { APP_NAME, APP_DESCRIPTION } from './config';

const FEATURES = [
  { title: 'Policy Management', desc: 'Store all your insurance policies in one secure, organized location.', icon: '🛡️' },
  { title: 'PDF Extraction', desc: 'Upload policy documents and auto-extract key data using AI.', icon: '📄' },
  { title: 'Premium Tracking', desc: 'Track payments, due dates, and annual spending at a glance.', icon: '💰' },
  { title: 'Renewal Reminders', desc: 'Never miss a renewal date with automated reminders.', icon: '🔔' },
  { title: 'Claims Management', desc: 'File and track claims with status updates and documentation.', icon: '📋' },
  { title: 'Family Sharing', desc: 'Share policies with family members or team with granular permissions.', icon: '👥' },
];

export default function Home() {
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (token) router.replace('/policies');
  }, [token, router]);

  if (token) return null;

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 50%, var(--color-primary-light) 100%)',
        color: '#fff',
        padding: '80px 24px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h1 style={{ fontSize: 42, fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.03em' }}>{APP_NAME}</h1>
          <p style={{ fontSize: 20, opacity: 0.9, margin: '0 0 32px', lineHeight: 1.6 }}>
            The modern way to organize, track, and manage all your insurance policies in one secure place.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '14px 32px',
                fontSize: 16,
                fontWeight: 600,
                backgroundColor: 'var(--color-accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              Get Started
            </button>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '14px 32px',
                fontSize: 16,
                fontWeight: 600,
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '64px 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, margin: '0 0 8px', color: 'var(--color-primary)' }}>
          Everything you need
        </h2>
        <p style={{ textAlign: 'center', fontSize: 16, color: 'var(--color-text-secondary)', margin: '0 0 48px' }}>
          Manage your entire insurance portfolio from one dashboard.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {FEATURES.map(f => (
            <div key={f.title} className="card" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: 'var(--color-text)' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 13 }}>
        {APP_NAME} — Secure insurance policy management
      </div>
    </div>
  );
}
