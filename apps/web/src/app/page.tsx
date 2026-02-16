'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { APP_NAME, APP_TAGLINE, APP_CONTACT_EMAIL } from './config';
import Logo from './components/Logo';

export default function Home() {
  const { token } = useAuth();
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const ctaAction = () => router.push(token ? '/policies' : '/login');
  const ctaLabel = token ? 'View My Coverage' : 'Get Started Free';

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* ═══════════════════════════════════════════════════════════════
          NAVIGATION (only shown when logged out — sidebar handles nav when logged in)
      ═══════════════════════════════════════════════════════════════ */}
      {!token && (
        <header className="landing-header" style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
          borderBottom: '1px solid var(--color-border)',
          padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ cursor: 'pointer' }}
          >
            <Logo size="md" variant="dark" />
          </div>
          <nav className="landing-nav-links">
            <span onClick={() => scrollTo('how-it-works')} style={{ fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>How it works</span>
            <span onClick={() => scrollTo('security')} style={{ fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Security</span>
            <span onClick={() => scrollTo('faq')} style={{ fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>FAQ</span>
            <button onClick={() => router.push('/login')} style={{
              padding: '8px 20px', fontSize: 14, fontWeight: 600,
              backgroundColor: 'var(--color-primary)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
            }}>
              Sign in
            </button>
          </nav>
        </header>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          1. HERO
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{
        paddingTop: token ? 60 : 120, paddingBottom: 80, paddingLeft: 24, paddingRight: 24,
        background: 'linear-gradient(160deg, #0f1f33 0%, var(--color-primary-dark) 30%, var(--color-primary) 70%, var(--color-primary-light) 100%)',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle gradient overlay for depth */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(ellipse at 70% 20%, rgba(63,167,163,0.12) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          {/* Logo mark in hero */}
          <div style={{ marginBottom: 24 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/covrabl-mark.svg"
              alt="Covrabl"
              width={64}
              height={64}
              style={{ display: 'inline-block', opacity: 0.9 }}
            />
          </div>
          <h1 style={{
            fontSize: 48, fontWeight: 700, margin: '0 0 20px', lineHeight: 1.15,
            letterSpacing: 'var(--letter-spacing-tight)',
            fontFamily: 'var(--font-heading)',
          }}>
            Your coverage, finally clear.
          </h1>
          <p style={{ fontSize: 18, opacity: 0.95, margin: '0 0 8px', lineHeight: 1.7, maxWidth: 720, marginLeft: 'auto', marginRight: 'auto', fontWeight: 500 }}>
            {APP_NAME} reads your policies, tracks what changed, finds what&apos;s missing, and keeps the right people informed — so you always know where you stand.
          </p>
          <p style={{ fontSize: 15, opacity: 0.7, margin: '0 0 36px', lineHeight: 1.7, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto', letterSpacing: 'var(--letter-spacing-wide)' }}>
            Private. Independent. No credit card required.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
            <button onClick={ctaAction} style={{
              padding: '14px 36px', fontSize: 16, fontWeight: 600,
              backgroundColor: 'var(--color-secondary)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(63, 167, 163, 0.3)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}>
              {ctaLabel}
            </button>
            <button onClick={() => scrollTo('how-it-works')} style={{
              padding: '14px 32px', fontSize: 16, fontWeight: 500,
              backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              backdropFilter: 'blur(4px)',
              transition: 'background 0.15s',
            }}>
              See how it works
            </button>
          </div>
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', fontSize: 13, opacity: 0.6, letterSpacing: 'var(--letter-spacing-wide)' }}>
            <span>Your data stays yours</span>
            <span>Encrypted &amp; private</span>
            <span>Setup in ~10 minutes</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          2. THE SILENCE PROBLEM
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 24px', color: 'var(--color-text)', lineHeight: 1.3 }}>
            The problem with insurance isn&apos;t the cost.{' '}
            <span style={{ color: 'var(--color-text-secondary)' }}>It&apos;s the silence.</span>
          </h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 1.8, margin: '0 0 32px' }}>
            Nothing tells you when a limit is too low. Nothing alerts you when a renewal quietly drops coverage. Nothing warns you that your umbrella doesn&apos;t cover what you think it does.
          </p>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 1.8, margin: '0 0 32px' }}>
            Most people find out they have a gap when a claim gets denied.
          </p>
          <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-secondary-dark)', margin: 0 }}>
            {APP_NAME} breaks the silence.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          3. OWN YOUR COVERAGE
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 24px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 16px', textAlign: 'center', color: 'var(--color-text)' }}>
            One place for everything you&apos;re covered for
          </h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', margin: '0 0 40px', textAlign: 'center', lineHeight: 1.7, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
            Insurance information is fragmented across carrier portals, emails, and files you rarely revisit. {APP_NAME} gives you a single, structured view you control.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {[
              { title: 'Structured policy data', desc: 'Every policy organized with limits, deductibles, renewal dates, and contacts — not buried in PDFs.' },
              { title: 'Coverage intelligence', desc: 'Gaps, overlaps, and changes surfaced automatically. Not just storage — understanding.' },
              { title: 'Controlled access', desc: 'You decide who sees what. Share with family, advisors, or emergency contacts on your terms.' },
              { title: 'Always current', desc: 'Renewal tracking, status monitoring, and change detection keep your view up to date.' },
            ].map(item => (
              <div key={item.title} className="card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          4. HOW IT WORKS
      ═══════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 48px', textAlign: 'center', color: 'var(--color-text)' }}>
            How it works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 32 }}>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16, fontWeight: 700, color: 'var(--color-primary)', opacity: 0.3 }}>1</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 12px', color: 'var(--color-text)' }}>Add your policies</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Upload documents or forward emails. {APP_NAME} reads them and extracts the key details automatically — carrier, limits, deductibles, renewal dates, and more.
              </p>
            </div>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16, fontWeight: 700, color: 'var(--color-primary)', opacity: 0.3 }}>2</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 12px', color: 'var(--color-text)' }}>Your coverage becomes clear</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Gaps are identified, overlaps are flagged, renewals are tracked, and policy changes are detected and explained — all automatically.
              </p>
            </div>
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16, fontWeight: 700, color: 'var(--color-primary)', opacity: 0.3 }}>3</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 12px', color: 'var(--color-text)' }}>Stay continuously ready</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Proactive alerts before renewals, when gaps appear, and when something changes. Share safely with anyone who needs access.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          5. WHAT YOU'LL KNOW
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 24px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 16px', color: 'var(--color-text)' }}>
            After 10 minutes with {APP_NAME}, you&apos;ll know:
          </h2>
          <div style={{ textAlign: 'left', maxWidth: 520, margin: '32px auto 0', fontSize: 16, lineHeight: 2.4 }}>
            {[
              'Exactly what every policy covers — and what it doesn\'t',
              'When every renewal is coming and what changed last time',
              'Where the gaps in your coverage are',
              'Who to call for every policy — claims, agent, broker',
              'That the right people can access your info in an emergency',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: 18, lineHeight: '2.4', flexShrink: 0 }}>&check;</span>
                <span style={{ color: 'var(--color-text)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          6. EMERGENCY SHARING (ELEVATED)
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 16px', color: 'var(--color-text)' }}>
            Be ready when it matters
          </h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 1.8, margin: '0 0 32px' }}>
            If something happens, the right people should know what coverage exists. No searching through email. No calling carriers on hold. Just access when it matters most.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, textAlign: 'left' }}>
            {[
              { who: 'Family members', what: 'Spouse, adult children, or parents can see what\'s covered without needing your passwords.' },
              { who: 'Caregivers', what: 'Aging parents\' coverage accessible to the people helping manage their lives.' },
              { who: 'Advisors & attorneys', what: 'Share your full coverage picture with professionals who need it — on your terms.' },
              { who: 'Emergency contacts', what: 'A secure, PIN-protected card with essential policy info — accessible from any phone.' },
            ].map(item => (
              <div key={item.who} style={{ padding: 20, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>{item.who}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{item.what}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          7. WHO IT'S FOR
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 24px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 40px', textAlign: 'center', color: 'var(--color-text)' }}>
            Built for people who take coverage seriously
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {[
              { title: 'Homeowners & families', desc: 'Auto, home, umbrella, life, health — multiple policies across multiple carriers, finally organized in one place.' },
              { title: 'Small business owners', desc: 'GL, professional liability, cyber, workers\' comp, COIs — track every business policy and know where the gaps are.' },
              { title: 'Property owners', desc: 'Multiple dwellings, multiple policies, multiple renewal dates. See everything at a glance.' },
              { title: 'Family organizers & caregivers', desc: 'Managing insurance for aging parents or your household. Know what exists and share access with the people who need it.' },
            ].map(p => (
              <div key={p.title} className="card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>{p.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          8. COMPARISON
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 48px', textAlign: 'center', color: 'var(--color-text)' }}>
            Insurance management hasn&apos;t changed in 20 years.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
            <div className="card" style={{ padding: 32, backgroundColor: '#fafafa' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px', color: 'var(--color-text-muted)' }}>Without {APP_NAME}</h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--color-text-secondary)', lineHeight: 2.2, listStyleType: "'\\2717  '" }}>
                <li>Policies in drawers, emails, and portals you rarely check</li>
                <li>No idea what&apos;s actually covered until you need it</li>
                <li>Renewals pass without review</li>
                <li>Gaps discovered when a claim is denied</li>
                <li>Calling your agent and waiting on hold for basic answers</li>
                <li>Family has no access if something happens to you</li>
              </ul>
            </div>
            <div className="card" style={{ padding: 32, borderColor: 'var(--color-primary)', borderWidth: 2 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px', color: 'var(--color-primary)' }}>With {APP_NAME}</h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--color-text)', lineHeight: 2.2, listStyleType: "'\\2713  '" }}>
                <li>Every policy structured and searchable in one place</li>
                <li>Limits, deductibles, and gaps visible at a glance</li>
                <li>Renewal alerts before every deadline</li>
                <li>Changes detected and explained in plain language</li>
                <li>Instant answers — no phone calls required</li>
                <li>Secure emergency access for the people who need it</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          9. WHAT COVRABL IS NOT (TRUST BUILDER)
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 24px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 16px', color: 'var(--color-text)' }}>
            {APP_NAME} is built for clarity — not selling.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 1.8, margin: '0 0 32px' }}>
            We organize and explain your coverage so you can make better decisions. That&apos;s it.
          </p>
          <div style={{ textAlign: 'left', maxWidth: 440, margin: '0 auto', fontSize: 15, lineHeight: 2.4 }}>
            {[
              { bold: 'Not an insurance company.', rest: ' We don\'t sell policies or take commissions.' },
              { bold: 'Not a lead generator.', rest: ' Your info is never sold to agents or carriers.' },
              { bold: 'Not an advertising platform.', rest: ' No ads. No tracking. No data deals.' },
              { bold: 'Not a replacement for your agent.', rest: ' We help you understand what you have — so those conversations are better.' },
            ].map((item, i) => (
              <div key={i} style={{ color: 'var(--color-text)' }}>
                <strong>{item.bold}</strong>
                <span style={{ color: 'var(--color-text-secondary)' }}>{item.rest}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          10. SECURITY
      ═══════════════════════════════════════════════════════════════ */}
      <section id="security" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 16px', color: 'var(--color-text)' }}>
            Your data is sensitive. We treat it that way.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', margin: '0 0 40px', lineHeight: 1.7 }}>
            Insurance documents contain personal information. {APP_NAME} is built with security as a core requirement, not an afterthought.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, textAlign: 'left' }}>
            {[
              { title: 'Encrypted everywhere', desc: 'All data encrypted in transit (TLS) and at rest. Your documents are stored securely.' },
              { title: 'You control access', desc: 'Granular sharing permissions. You decide exactly who sees what — and revoke anytime.' },
              { title: 'Your data stays yours', desc: 'Never sold. Never shared with carriers or advertisers. Export or delete everything anytime.' },
              { title: 'Audit trail', desc: 'Every action is logged. You can see exactly what happened and when.' },
            ].map(s => (
              <div key={s.title} style={{ padding: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px', color: 'var(--color-text)' }}>{s.title}</h4>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          11. FAQ
      ═══════════════════════════════════════════════════════════════ */}
      <section id="faq" style={{ padding: '80px 24px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 40px', textAlign: 'center', color: 'var(--color-text)' }}>
            Frequently asked questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              {
                q: 'Is my data safe?',
                a: `Yes. All data is encrypted in transit and at rest. Your password is hashed with bcrypt — we can't see it. ${APP_NAME} is built with the same security standards used for financial applications.`,
              },
              {
                q: 'Do you sell my information to insurance companies?',
                a: `No. Never. Your individual policy data is never shared with carriers, agents, advertisers, or any third party. ${APP_NAME} is paid for by users, not by selling data.`,
              },
              {
                q: 'Can insurance companies see that I use Covrabl?',
                a: `No. ${APP_NAME} is completely independent. We have no relationship with any insurance carrier. Your account is private to you.`,
              },
              {
                q: 'How does the document reading work?',
                a: `Upload a PDF, scan, or photo of any policy document. ${APP_NAME} uses AI to extract the key details — carrier, limits, deductibles, renewal dates, contacts, and more. You review everything before it's saved.`,
              },
              {
                q: 'What if the extraction gets something wrong?',
                a: 'You always review extracted data before it\'s saved, and you can edit any field at any time. The AI handles the tedious data entry — you stay in control of the final result.',
              },
              {
                q: 'Can I share my coverage info with my agent or advisor?',
                a: 'Yes. You can invite advisors, agents, attorneys, or family members to view your coverage. You control permissions and can revoke access anytime.',
              },
              {
                q: 'Can I export or delete all my data?',
                a: 'Yes to both, anytime. Download your data as CSV or permanently delete your entire account. No lock-in, no data hostage.',
              },
              {
                q: 'Does this replace my insurance agent?',
                a: `No. ${APP_NAME} helps you understand what you have so your conversations with your agent are better. Think of it as preparation, not replacement.`,
              },
              {
                q: 'What types of insurance policies work with Covrabl?',
                a: 'All of them. Auto, home, renters, life, health, disability, umbrella, general liability, professional liability, cyber, workers\' comp, commercial property, and more. Personal and business.',
              },
              {
                q: 'How long does setup take?',
                a: 'About 10 minutes for most people. Upload your documents, review the extracted details, and you\'re done. You can always add more policies later.',
              },
            ].map((faq, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', paddingRight: 16 }}>{faq.q}</span>
                  <span style={{
                    fontSize: 20, color: 'var(--color-text-muted)', flexShrink: 0, lineHeight: 1,
                    transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s',
                  }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 0 20px', fontSize: 15, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          12. FOR ADVISORS
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 16px', color: 'var(--color-text)' }}>
            Work with an advisor? Even better.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', margin: '0 0 24px', lineHeight: 1.8 }}>
            Share your {APP_NAME} dashboard with your agent, broker, or attorney. They see your full coverage picture — gaps, renewals, and status — without you having to explain anything on the phone.
          </p>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.7, fontStyle: 'italic' }}>
            Advisors: your clients can invite you. One dashboard, every client&apos;s coverage, organized.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          13. FINAL CTA
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{
        padding: '80px 24px',
        background: 'linear-gradient(160deg, #0f1f33 0%, var(--color-primary-dark) 40%, var(--color-primary) 100%)',
        color: '#fff', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(ellipse at 30% 80%, rgba(63,167,163,0.1) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 16px', letterSpacing: 'var(--letter-spacing-tight)' }}>
            Know where you stand.
          </h2>
          <p style={{ fontSize: 18, opacity: 0.9, margin: '0 0 32px' }}>
            Your coverage is too important to guess about.
          </p>
          <button onClick={ctaAction} style={{
            padding: '16px 40px', fontSize: 18, fontWeight: 600,
            backgroundColor: 'var(--color-secondary)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(63, 167, 163, 0.3)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}>
            {ctaLabel}
          </button>
          <div style={{ marginTop: 16, fontSize: 13, opacity: 0.6, letterSpacing: 'var(--letter-spacing-wide)' }}>
            No credit card required
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════ */}
      <footer style={{ padding: '32px 24px', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 13 }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
            <span onClick={() => router.push('/privacy')} style={{ cursor: 'pointer' }}>Privacy</span>
            <span onClick={() => router.push('/terms')} style={{ cursor: 'pointer' }}>Terms</span>
            <a href={`mailto:${APP_CONTACT_EMAIL}`} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>{APP_CONTACT_EMAIL}</a>
          </div>
          <div style={{ textAlign: 'center' }}>
            {APP_NAME} — {APP_TAGLINE}
          </div>
        </div>
      </footer>
    </div>
  );
}
