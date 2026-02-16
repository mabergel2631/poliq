'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { APP_NAME, APP_TAGLINE } from './config';

export default function Home() {
  const { token } = useAuth();
  const router = useRouter();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Navigation Header */}
      <header className="landing-header" style={{
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
        <nav className="landing-nav-links">
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
            {token ? 'My Coverage' : 'Sign in'}
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
            Your AI insurance analyst — always watching, always ready.
          </h1>
          <p style={{ fontSize: 18, opacity: 0.95, margin: '0 0 8px', lineHeight: 1.7, maxWidth: 700, marginLeft: 'auto', marginRight: 'auto', fontWeight: 600 }}>
            Intelligent insurance that actually works for you.
          </p>
          <p style={{ fontSize: 17, opacity: 0.9, margin: '0 0 32px', lineHeight: 1.7, maxWidth: 700, marginLeft: 'auto', marginRight: 'auto' }}>
            {APP_NAME} analyzes every policy you own — scoring your protection, detecting coverage gaps, tracking renewal deadlines, and explaining what changed. So you always know exactly where you stand.
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
              {token ? 'View My Coverage' : 'Get Started'}
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
            <span>AI-powered analysis</span>
            <span>Encrypted &amp; private</span>
            <span>Real-time monitoring</span>
          </div>
        </div>
      </section>

      {/* 2. PROBLEM SECTION */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 24px', color: 'var(--color-text)' }}>
            Most people have no idea if their coverage actually protects them.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 1.8, margin: '0 0 32px' }}>
            Policies are scattered across carriers, emails, portals, and PDFs. Without an analyst watching everything, the important questions go unanswered:
          </p>
          <div style={{ textAlign: 'left', maxWidth: 420, margin: '0 auto 32px', fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 2.2 }}>
            <div>&bull; Where are the gaps in my coverage?</div>
            <div>&bull; How strong is my overall protection?</div>
            <div>&bull; When do my policies renew — and am I ready?</div>
            <div>&bull; What changed since last year?</div>
            <div>&bull; What should I do next?</div>
          </div>
          <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-primary)', margin: 0 }}>
            {APP_NAME} watches everything and tells you exactly what needs attention.
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
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 12px', color: 'var(--color-text)' }}>Add your policies</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Upload PDFs, scans, or photos. {APP_NAME}&apos;s AI extracts every key detail automatically — carrier, limits, deductibles, renewal dates, and more.
              </p>
            </div>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>2</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 12px', color: 'var(--color-text)' }}>{APP_NAME} analyzes everything</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Your coverage is scored, gaps are identified, renewals are tracked, and policy changes are detected and explained — all automatically.
              </p>
            </div>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>3</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 12px', color: 'var(--color-text)' }}>Stay protected effortlessly</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Get proactive alerts before renewals, when gaps appear, and when something changes. {APP_NAME} keeps watching so you don&apos;t have to.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURES — What Covrabl does */}
      <section id="features" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 16px', color: 'var(--color-text)' }}>
            What {APP_NAME} does
          </h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', margin: '0 0 40px', lineHeight: 1.7 }}>
            {APP_NAME} doesn&apos;t just store your policies — it continuously analyzes them to keep you protected.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, textAlign: 'left' }}>
            {[
              { icon: '🤖', title: 'AI-powered extraction', desc: `Upload a document and ${APP_NAME} reads it — extracting carrier, limits, deductibles, renewal dates, and more automatically.` },
              { icon: '💯', title: 'Protection Score', desc: 'A 0\u2013100 score across your entire portfolio so you know how strong your coverage is at a glance.' },
              { icon: '🔍', title: 'Gap detection', desc: 'Identifies missing coverage types and inadequate limits before they become problems.' },
              { icon: '🔔', title: 'Renewal tracking', desc: 'Automatic alerts before every deadline so you never miss a renewal or lapse in coverage.' },
              { icon: '📊', title: 'Change detection', desc: `When a policy renews, ${APP_NAME} spots what changed and explains it in plain language.` },
              { icon: '🚨', title: 'Emergency-ready sharing', desc: 'Secure access for loved ones, caregivers, or attorneys — so critical info is available when it matters most.' },
            ].map(f => (
              <div key={f.title} className="card" style={{ padding: 24 }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
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
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 16px', textAlign: 'center', color: 'var(--color-text)' }}>
            Insurance management has barely changed. Until now.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', margin: '0 0 48px', textAlign: 'center', lineHeight: 1.7 }}>
            Most people still manage insurance the same way they did 20 years ago.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
            <div className="card" style={{ padding: 32, backgroundColor: '#fafafa' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px', color: 'var(--color-text-muted)' }}>The old way</h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--color-text-secondary)', lineHeight: 2.2, listStyleType: "'\\2717  '" }}>
                <li>Paper policies stuffed in a drawer</li>
                <li>PDFs buried across email threads</li>
                <li>Calling your agent and waiting on hold</li>
                <li>No idea what&apos;s actually covered</li>
                <li>Finding out about a gap when a claim is denied</li>
                <li>Renewals missed because no one was tracking</li>
              </ul>
            </div>
            <div className="card" style={{ padding: 32, borderColor: 'var(--color-primary)', borderWidth: 2 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px', color: 'var(--color-primary)' }}>The {APP_NAME} way</h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--color-text)', lineHeight: 2.2, listStyleType: "'\\2713  '" }}>
                <li>Upload once — AI reads and organizes everything</li>
                <li>Every policy scored, analyzed, and monitored</li>
                <li>Gaps and changes surfaced automatically</li>
                <li>Renewal alerts before every deadline</li>
                <li>Know exactly where you stand at a glance</li>
                <li>Emergency access for the people who need it</li>
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
            AI analysis of your insurance requires trust. {APP_NAME} treats your data accordingly.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, textAlign: 'left' }}>
            {[
              { title: 'Encryption', desc: 'Data encrypted in transit and at rest.' },
              { title: 'Permissioned sharing', desc: 'Control exactly who sees what.' },
              { title: 'Data ownership', desc: 'Your data stays yours.' },
              { title: 'Privacy-first design', desc: 'Built with privacy as a core principle.' },
            ].map(s => (
              <div key={s.title} style={{ padding: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px', color: 'var(--color-text)' }}>{s.title}</h4>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FOR ADVISORS */}
      <section id="advisors" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 16px', color: 'var(--color-text)' }}>
            Work with an advisor? Even better.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', margin: '0 0 24px', lineHeight: 1.8 }}>
            Share access with your agent, attorney, or financial advisor. They see your coverage intelligence and can help you act on it — scores, gaps, renewals, and recommendations all in one place.
          </p>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.7, fontStyle: 'italic' }}>
            Advisors: your clients can invite you. You&apos;ll see their scores, gaps, and renewals in one dashboard.
          </p>
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
          <h2 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 16px' }}>
            Let AI handle the complexity.
          </h2>
          <p style={{ fontSize: 18, opacity: 0.9, margin: '0 0 32px' }}>
            You just stay protected.
          </p>
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
            {token ? 'View My Coverage' : 'Get Started'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 12 }}>
          <span onClick={() => router.push('/privacy')} style={{ cursor: 'pointer' }}>Privacy</span>
          <span onClick={() => router.push('/terms')} style={{ cursor: 'pointer' }}>Terms</span>
        </div>
        {APP_NAME} — {APP_TAGLINE}
      </footer>
    </div>
  );
}
