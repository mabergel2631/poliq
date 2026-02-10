'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { APP_NAME } from './config';

export default function Home() {
  const { token } = useAuth();
  const router = useRouter();

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
          <span onClick={() => scrollTo('how-it-works')} style={{ fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>How it works</span>
          <span onClick={() => scrollTo('features')} style={{ fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Features</span>
          <span onClick={() => scrollTo('security')} style={{ fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Security</span>
          <button
            onClick={() => router.push(token ? '/policies' : '/login')}
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
            {token ? 'Dashboard' : 'Sign in'}
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
            Know your coverage. Before you need it.
          </h1>
          <p style={{ fontSize: 18, opacity: 0.9, margin: '0 0 32px', lineHeight: 1.7, maxWidth: 700, marginLeft: 'auto', marginRight: 'auto' }}>
            {APP_NAME} turns insurance PDFs into structured, searchable coverage information—limits, deductibles, renewals, and key contacts—so you can make decisions quickly and avoid surprises.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
            <button
              onClick={() => router.push(token ? '/policies' : '/login')}
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
              {token ? 'Go to Dashboard' : 'Get Started'}
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
              See how it works
            </button>
          </div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', fontSize: 13, opacity: 0.8 }}>
            <span>Encrypted storage</span>
            <span>Private by design</span>
            <span>Built for sensitive information</span>
          </div>
        </div>
      </section>

      {/* 2. PROBLEM SECTION */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 24px', color: 'var(--color-text)' }}>
            Insurance shouldn&apos;t be a scavenger hunt.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 1.8, margin: '0 0 32px' }}>
            Policies live across email threads, portals, PDFs, and folders. When something happens, the questions are always the same:
          </p>
          <div style={{ textAlign: 'left', maxWidth: 400, margin: '0 auto 32px', fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 2.2 }}>
            <div>• What am I covered for?</div>
            <div>• What&apos;s my deductible right now?</div>
            <div>• Who do I call?</div>
            <div>• When does this renew—and what changed?</div>
          </div>
          <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-primary)', margin: 0 }}>
            {APP_NAME} gives you one clear answer: your coverage, organized and understood.
          </p>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: '80px 24px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 48px', textAlign: 'center', color: 'var(--color-text)' }}>
            How it works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 32 }}>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>1</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 12px', color: 'var(--color-text)' }}>Add policies</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Upload PDFs, scans, photos—or forward documents. (Carrier connections come later.)
              </p>
            </div>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>2</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 12px', color: 'var(--color-text)' }}>{APP_NAME} extracts what matters</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                {APP_NAME} pulls key fields into a consistent format: carrier, policy number, limits, deductibles, and renewal dates.
              </p>
            </div>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>3</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 12px', color: 'var(--color-text)' }}>Stay continuously ready</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Search instantly, track renewals, share safely, and keep everything current.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CORE VALUE */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 16px', color: 'var(--color-text)' }}>
            Not a dashboard. A coverage intelligence layer.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', margin: '0 0 32px', lineHeight: 1.7 }}>
            {APP_NAME} isn&apos;t just a place to store policies. It turns documents into usable knowledge—so you can see what you have, what&apos;s missing, and what needs attention.
          </p>
          <div style={{ textAlign: 'left', maxWidth: 450, margin: '0 auto', fontSize: 15, color: 'var(--color-text)', lineHeight: 2.2 }}>
            <div>• Limits and deductibles in plain view</div>
            <div>• Renewal dates with reminders</div>
            <div>• Contacts and claim details attached to the policy</div>
            <div>• A single place to share with family or advisors (with permissions)</div>
          </div>
        </div>
      </section>

      {/* 5. FEATURES */}
      <section id="features" style={{ padding: '80px 24px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 48px', textAlign: 'center', color: 'var(--color-text)' }}>
            What {APP_NAME} does
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { title: 'Policy clarity', desc: 'Auto, home, life, umbrella, liability, and more in one place.' },
              { title: 'Automatic extraction', desc: 'No manual retyping. Upload and Keeps captures key details.' },
              { title: 'Instant search', desc: 'Find policies by carrier, policy number, limits, or any extracted field.' },
              { title: 'Renewal awareness', desc: 'Reminders before renewals and critical deadlines.' },
              { title: 'Claims organization', desc: 'Keep claim documents and status tied to the policy.' },
              { title: 'Secure sharing', desc: 'Permissioned access for family members and advisors.' },
            ].map(f => (
              <div key={f.title} className="card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. COMPARISON */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 48px', textAlign: 'center', color: 'var(--color-text)' }}>
            {APP_NAME} vs. folders
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
            <div className="card" style={{ padding: 32 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: 'var(--color-text-muted)' }}>Traditional storage</h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--color-text-secondary)', lineHeight: 2 }}>
                <li>Files scattered</li>
                <li>Manual searching</li>
                <li>No reminders</li>
                <li>Key details buried</li>
              </ul>
            </div>
            <div className="card" style={{ padding: 32, borderColor: 'var(--color-primary)', borderWidth: 2 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: 'var(--color-primary)' }}>{APP_NAME}</h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--color-text)', lineHeight: 2 }}>
                <li>Extracted, structured data</li>
                <li>Search by what matters</li>
                <li>Proactive reminders</li>
                <li>Clear coverage view</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECURITY */}
      <section id="security" style={{ padding: '80px 24px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 16px', color: 'var(--color-text)' }}>
            Security built for sensitive documents
          </h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', margin: '0 0 40px', lineHeight: 1.7 }}>
            Insurance documents contain personal and financial details. {APP_NAME} is designed to treat them like it.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, textAlign: 'left' }}>
            {[
              { title: 'Encryption', desc: 'Data encrypted in transit and at rest' },
              { title: 'Permissioned sharing', desc: 'Control who sees what' },
              { title: 'Data ownership', desc: 'Your data stays yours' },
              { title: 'Privacy-first design', desc: 'Built with privacy as a core principle' },
            ].map(s => (
              <div key={s.title} style={{ padding: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px', color: 'var(--color-text)' }}>{s.title}</h4>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. AUDIENCE */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 48px', textAlign: 'center', color: 'var(--color-text)' }}>
            Built for people who want clarity
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 32 }}>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>👨‍👩‍👧‍👦</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>Families</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Prepared for the moments that matter.
              </p>
            </div>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>💼</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>Professionals</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Organized coverage and renewal visibility.
              </p>
            </div>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>Anyone with multiple policies</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                One view, no chaos.
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
            Be ready—without doing extra work.
          </h2>
          <button
            onClick={() => router.push(token ? '/policies' : '/login')}
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
            {token ? 'Go to Dashboard' : 'Get Started'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 12 }}>
          <span onClick={() => router.push('/privacy')} style={{ cursor: 'pointer' }}>Privacy</span>
        </div>
        {APP_NAME} — Coverage intelligence for your insurance
      </footer>
    </div>
  );
}
