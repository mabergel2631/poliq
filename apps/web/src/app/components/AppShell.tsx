'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { APP_NAME } from '../config';

const NAV_ITEMS = [
  { href: '/policies', label: 'Policies', icon: '📋' },
  { href: '/emergency', label: 'Emergency', icon: '🚨', urgent: true },
  { href: '/audit', label: 'Audit Log', icon: '📜' },
  { href: '/policies/compare', label: 'Compare', icon: '⚖️' },
  { href: '/privacy', label: 'Privacy', icon: '🔒' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { token, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd+K → focus search on policies page
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
        if (searchInput) searchInput.focus();
        else router.push('/policies');
      }
      // Escape → close sidebar
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sidebarOpen, router]);

  if (!token) return <>{children}</>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          style={{ display: 'none', position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 899 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar${sidebarOpen ? ' open' : ''}`}
        style={{
          width: 220,
          backgroundColor: 'var(--color-primary-dark)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{APP_NAME}</div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>Insurance Manager</div>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href || (item.href !== '/policies' && pathname.startsWith(item.href));
            const isPolActive = item.href === '/policies' && (pathname === '/policies' || (pathname.startsWith('/policies/') && !pathname.startsWith('/policies/compare')));
            const isActive = active || isPolActive;
            const isUrgent = 'urgent' in item && item.urgent;
            return (
              <button
                key={item.href}
                onClick={() => { router.push(item.href); setSidebarOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  border: isUrgent && !isActive ? '1px solid rgba(239,68,68,0.4)' : 'none',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.12)' : isUrgent ? 'rgba(239,68,68,0.1)' : 'transparent',
                  color: isUrgent ? '#fca5a5' : '#fff',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : isUrgent ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginBottom: 2,
                }}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => { logout(); router.replace('/login'); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '10px 12px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'transparent',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 14,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content" style={{ flex: 1, marginLeft: 0 }}>
        {/* Mobile header bar */}
        <div className="mobile-header" style={{
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: 'var(--color-primary-dark)',
          color: '#fff',
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', padding: 0 }}
          >
            ☰
          </button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{APP_NAME}</span>
          <div style={{ width: 22 }} />
        </div>
        {children}
      </div>
    </div>
  );
}
