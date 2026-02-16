'use client';

import { useRouter } from 'next/navigation';

type EmptyStateProps = {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
};

export default function EmptyState({ icon, title, subtitle, actionLabel, actionHref, onAction }: EmptyStateProps) {
  const router = useRouter();

  const handleAction = () => {
    if (onAction) onAction();
    else if (actionHref) router.push(actionHref);
  };

  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      backgroundColor: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: 'var(--color-text)' }}>
        {title}
      </h3>
      {subtitle && (
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
          {subtitle}
        </p>
      )}
      {actionLabel && (
        <button onClick={handleAction} className="btn btn-primary" style={{ padding: '10px 20px' }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
