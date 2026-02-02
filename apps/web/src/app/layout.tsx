'use client';

import { useEffect } from 'react';
import './globals.css';
import { AuthProvider } from '../../lib/auth';
import AppShell from './components/AppShell';
import { ToastProvider } from './components/Toast';
import { APP_NAME, APP_THEME_COLOR } from './config';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content={APP_THEME_COLOR} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={APP_NAME} />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body>
        <AuthProvider><ToastProvider><AppShell>{children}</AppShell></ToastProvider></AuthProvider>
      </body>
    </html>
  );
}
