'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import type { AuthUser } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (payload: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AUTH_STORAGE_KEY = 'precision-banking-auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthResponse;
        setUser(parsed.user);
        setToken(parsed.token);
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }

    setIsAuthLoading(false);
  }, []);

  const persistAuth = (auth: AuthResponse) => {
    setUser(auth.user);
    setToken(auth.token);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  };

  const login = async (credentials: { email: string; password: string }) => {
    const auth = await apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });

    persistAuth(auth);
  };

  const register = async (payload: { name: string; email: string; password: string }) => {
    const auth = await apiRequest<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    persistAuth(auth);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
