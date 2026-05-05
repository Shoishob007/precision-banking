'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, AUTH_INVALID_EVENT } from '@/lib/api';
import type { AuthUser } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthLoading: boolean;
  authError: string | null;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (payload: { name: string; email: string; password: string }) => Promise<void>;
  logout: (reason?: string) => void;
  updateUser: (user: AuthUser) => void;
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
  const [authError, setAuthError] = useState<string | null>(null);

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
    setAuthError(null);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  };

  const updateUser = (nextUser: AuthUser) => {
    setUser(nextUser);
    setAuthError(null);
    if (token) {
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ token, user: nextUser } satisfies AuthResponse),
      );
    }
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

  const logout = (reason?: string) => {
    setUser(null);
    setToken(null);
    setAuthError(reason ?? null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  useEffect(() => {
    const onInvalidAuth = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      logout(customEvent.detail?.message ?? 'Session expired. Please log in again.');
    };

    window.addEventListener(AUTH_INVALID_EVENT, onInvalidAuth as EventListener);
    return () => {
      window.removeEventListener(AUTH_INVALID_EVENT, onInvalidAuth as EventListener);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthLoading, authError, login, register, logout, updateUser }}>
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
