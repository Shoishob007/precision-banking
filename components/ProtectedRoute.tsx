'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/');
    }
  }, [isAuthLoading, user, router]);

  if (isAuthLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
