'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AuthState = {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState>({
  token: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('pv_token');
    if (stored) setToken(stored);
  }, []);

  const login = (t: string) => {
    localStorage.setItem('pv_token', t);
    setToken(t);
  };

  const logout = () => {
    localStorage.removeItem('pv_token');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
