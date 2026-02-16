'use client';

import { APP_NAME } from '../config';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
  showText?: boolean;
}

const SIZES = { sm: 24, md: 32, lg: 44 };
const FONT_SIZES = { sm: 16, md: 20, lg: 28 };

export default function Logo({ size = 'md', variant = 'dark', showText = true }: LogoProps) {
  const px = SIZES[size];
  const fontSize = FONT_SIZES[size];
  const color = variant === 'light' ? '#fff' : 'var(--color-primary)';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {/* Logo mark — replace this SVG with the real logo when ready */}
      <svg
        width={px}
        height={px}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Open "C" mark as placeholder — clean geometric shape */}
        <circle cx="20" cy="20" r="18" stroke={color} strokeWidth="3.5" fill="none" />
        <path
          d="M28 12.5A12 12 0 1 0 28 27.5"
          stroke="var(--color-secondary)"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {showText && (
        <span style={{
          fontSize,
          fontWeight: 700,
          color,
          letterSpacing: 'var(--letter-spacing-tight)',
          fontFamily: 'var(--font-heading)',
        }}>
          {APP_NAME}
        </span>
      )}
    </span>
  );
}
