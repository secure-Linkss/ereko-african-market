'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { authService } from '@/services/auth';

export function AuthInitializer() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      setLoading(false);
      return;
    }
    if (isAuthenticated) {
      setLoading(false);
      return;
    }
    authService.getProfile()
      .then((user) => {
        setUser(user);
        setLoading(false);
      })
      .catch(() => {
        clearSession();
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
