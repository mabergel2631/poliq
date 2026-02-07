'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { APP_NAME } from './config';

export default function Home() {
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (token) router.replace('/policies');
  }, [token, router]);

  if (token) return null;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Navigation Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--color-border)',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-primary)', cursor: 'pointer' }}
        >
          {APP_NAME}
        </div>
        <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <span onClick={() => scrollTo('how-it-works')} style={{ fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>How It Works</span>
          <span onClick={() => scrollTo('features')} style={{ fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Features</span>
          <span onClick={() => scrollTo('security')} style={{ fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Security</span>
          <button
            onClick={() => router.push('/login')}
            style={{
              padding: '8px 20px',
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
        </nav>
      </header>

      {/* 1. HERO SECTION */}
      <section style={{
        paddingTop: 120,
        paddingBottom: 60,
        paddingLeft: 24,
        paddingRight: 24,
        background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 50%, var(--color-primary-light) 100%)',
        color: '#fff',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 44, fontWeight: 700, margin: '0 0 20px', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            Know exactly what you&apos;re covered for — instantly.
          </h1>
          <p style={{ fontSize: 18, opacity: 0.9, margin: '0 0 32px', lineHeight: 1.7, maxWidth: 700, marginLeft: 'auto', marginRight: 'auto' }}>
            {APP_NAME} securely stores your insurance policies, extracts key details automatically, and reminds you before renewals and deadlines — so your coverage is always organized, clear, and ready when you need it.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
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
              onClick={() => scrollTo('how-it-works')}
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
              See How It Works
            </button>
          </div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', fontSize: 13, opacity: 0.8 }}>
            <span>Encrypted storage</span>
            <span>Private by design</span>
            <span>Built for sensitive information</span>
          </div>
        </div>
      </section>

      {/* 2. TRUST STRIP */}
      <section style={{ background: 'var(--color-surface)', padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap', fontSize: 14, color: 'var(--color-text-secondary)' }}>
          <span>Designed for sensitive financial documents</span>
          <span>Automatic data extraction from PDFs</span>
          <span>Built for clarity and preparedness</span>
        </div>
      </section>

      {/* 3. PROBLEM SECTION */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 24px', color: 'var(--color-text)' }}>
            Insurance shouldn&apos;t feel complicated.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 1.8, margin: '0 0 32px' }}>
            Most policies are scattered across emails, drives, and folders. When you actually need them:
          </p>
          <div style={{ textAlign: 'left', maxWidth: 400, margin: '0 auto 32px', fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 2 }}>
            <div>You don&apos;t know your deductible</div>
            <div>You can&apos;t find the right version</div>
            <div>Renewal dates sneak up on you</div>
            <div>Important details are buried in long PDFs</div>
          </div>
          <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-primary)', margin: 0 }}>
            {APP_NAME} fixes this.
          </p>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: '80px 24px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 48px', textAlign: 'center', color: 'var(--color-text)' }}>
            How It Works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 32 }}>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>1</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 12px', color: 'var(--color-text)' }}>Upload</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Upload policies or documents — PDFs, scans, or photos.
              </p>
            </div>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>2</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 12px', color: 'var(--color-text)' }}>{APP_NAME} Understands</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Automatically extracts carrier, policy number, coverage limits, deductibles, and renewal dates.
              </p>
            </div>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>3</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 12px', color: 'var(--color-text)' }}>Stay Ready</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Search instantly, track renewals, and receive reminders before deadlines.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CORE FEATURES */}
      <section id="features" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 16px', textAlign: 'center', color: 'var(--color-text)' }}>
            One intelligent dashboard for your entire insurance life.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', textAlign: 'center', margin: '0 0 48px' }}>
            Everything you need to stay organized and prepared.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { title: 'Policy Management', desc: 'All policies in one place — auto, home, life, umbrella, and more.' },
              { title: 'Automatic PDF Extraction', desc: 'No manual data entry. Upload and let AI do the work.' },
              { title: 'Instant Search', desc: 'Find answers fast. Search by carrier, coverage, or any detail.' },
              { title: 'Renewal Reminders', desc: 'Never miss important dates. Get notified before deadlines.' },
              { title: 'Claims Management', desc: 'Keep claim documents organized and track status.' },
              { title: 'Secure Sharing', desc: 'Controlled access for family members or advisors.' },
            ].map(f => (
              <div key={f.title} className="card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. DIFFERENTIATION */}
      <section style={{ padding: '80px 24px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 48px', textAlign: 'center', color: 'var(--color-text)' }}>
            Not just storage — {APP_NAME} understands your policies.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
            <div className="card" style={{ padding: 32 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: 'var(--color-text-muted)' }}>Traditional Storage</h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--color-text-secondary)', lineHeight: 2 }}>
                <li>Files in scattered folders</li>
                <li>Manual searching</li>
                <li>No alerts or reminders</li>
                <li>Details buried in PDFs</li>
              </ul>
            </div>
            <div className="card" style={{ padding: 32, borderColor: 'var(--color-primary)', borderWidth: 2 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: 'var(--color-primary)' }}>{APP_NAME}</h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--color-text)', lineHeight: 2 }}>
                <li>Extracts key information automatically</li>
                <li>Structured, searchable data</li>
                <li>Proactive renewal reminders</li>
                <li>Everything at a glance</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECURITY */}
      <section id="security" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 16px', color: 'var(--color-text)' }}>
            Security you can trust.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', margin: '0 0 40px', lineHeight: 1.7 }}>
            Your insurance documents contain sensitive information. We treat them that way.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, textAlign: 'left' }}>
            {[
              { title: 'Encryption', desc: 'Data encrypted at rest and in transit' },
              { title: 'Permission-Based Sharing', desc: 'Control who sees what' },
              { title: 'Data Ownership', desc: 'Your data belongs to you' },
              { title: 'Privacy-First Design', desc: 'Built with privacy as a core principle' },
            ].map(s => (
              <div key={s.title} style={{ padding: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px', color: 'var(--color-text)' }}>{s.title}</h4>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. USE CASES */}
      <section style={{ padding: '80px 24px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 48px', textAlign: 'center', color: 'var(--color-text)' }}>
            Built for people who value preparedness.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 32 }}>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>👨‍👩‍👧‍👦</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>Families</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Prepared for emergencies and life events.
              </p>
            </div>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>💼</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>Professionals</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Organized risk management for your business.
              </p>
            </div>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>Anyone with Multiple Policies</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Clear overview without chaos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FINAL CTA */}
      <section style={{
        padding: '80px 24px',
        background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
        color: '#fff',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 24px' }}>
            Be ready for the moments that matter.
          </h2>
          <button
            onClick={() => router.push('/login')}
            style={{
              padding: '16px 40px',
              fontSize: 18,
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
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 13 }}>
        {APP_NAME} — Secure insurance policy management
      </footer>
    </div>
  );
}
