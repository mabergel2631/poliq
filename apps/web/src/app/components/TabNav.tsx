'use client';

type Tab = {
  key: string;
  label: string;
};

type TabNavProps = {
  tabs: Tab[];
  activeKey: string;
  onSelect: (key: string) => void;
  variant?: 'underline' | 'pill' | 'segmented';
};

export default function TabNav({ tabs, activeKey, onSelect, variant = 'underline' }: TabNavProps) {
  if (variant === 'segmented') {
    return (
      <div style={{
        display: 'flex',
        gap: 0,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        width: 'fit-content',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            style={{
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeKey === tab.key ? 'var(--color-primary)' : '#fff',
              color: activeKey === tab.key ? '#fff' : 'var(--color-text-secondary)',
              textTransform: 'capitalize',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              backgroundColor: activeKey === tab.key ? 'var(--color-primary)' : '#f3f4f6',
              color: activeKey === tab.key ? '#fff' : 'var(--color-text)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  // Default: underline
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--color-border)' }}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onSelect(tab.key)}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeKey === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: -2,
            backgroundColor: 'transparent',
            fontWeight: activeKey === tab.key ? 600 : 400,
            color: activeKey === tab.key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
