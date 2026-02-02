'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';
type Toast = { id: number; message: string; type: ToastType };

const ToastContext = createContext<{
  toast: (message: string, type?: ToastType) => void;
}>({ toast: () => {} });

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const colors: Record<ToastType, { bg: string; border: string; text: string }> = {
    success: { bg: 'var(--color-success-bg)', border: '#6ee7b7', text: 'var(--color-success)' },
    error: { bg: 'var(--color-danger-bg)', border: '#fecaca', text: 'var(--color-danger)' },
    info: { bg: 'var(--color-info-bg)', border: '#bfdbfe', text: 'var(--color-info)' },
    warning: { bg: 'var(--color-warning-bg)', border: '#fde68a', text: 'var(--color-warning)' },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
        {toasts.map(t => {
          const c = colors[t.type];
          return (
            <div
              key={t.id}
              style={{
                padding: '12px 16px',
                backgroundColor: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: 'var(--radius-md)',
                color: c.text,
                fontSize: 14,
                fontWeight: 500,
                boxShadow: 'var(--shadow-md)',
                animation: 'toast-in 0.2s ease-out',
              }}
            >
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
