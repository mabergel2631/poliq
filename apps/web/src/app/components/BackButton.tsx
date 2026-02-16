'use client';

import { useRouter } from 'next/navigation';

type BackButtonProps = {
  href: string;
  label: string;
  /** Optional parent label for breadcrumb style: "Parent / Current" */
  parentLabel?: string;
};

export default function BackButton({ href, label, parentLabel }: BackButtonProps) {
  const router = useRouter();

  if (parentLabel) {
    return (
      <nav style={{ marginBottom: 16, fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => router.push(href)}
          style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 13, padding: 0 }}
        >
          {parentLabel}
        </button>
        <span>/</span>
        <span style={{ color: 'var(--color-text)' }}>{label}</span>
      </nav>
    );
  }

  return (
    <button
      onClick={() => router.push(href)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'none',
        border: 'none',
        color: 'var(--color-text-secondary)',
        fontSize: 14,
        cursor: 'pointer',
        padding: '0 0 16px',
      }}
    >
      &larr; {label}
    </button>
  );
}
