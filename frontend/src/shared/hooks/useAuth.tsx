import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '../types';

interface AuthCtx {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
  /** Returns true if user has the given permission (or has wildcard '*') */
  hasPermission: (perm: string) => boolean;
  /** Convenience role flags */
  isSuperAdmin: boolean;
  isClientAdmin: boolean;
  isClientUser: boolean;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('gj_token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('gj_user');
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  });

  const login = (t: string, u: AuthUser) => {
    localStorage.setItem('gj_token', t);
    localStorage.setItem('gj_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('gj_token');
    localStorage.removeItem('gj_user');
    setToken(null);
    setUser(null);
  };

  const hasPermission = useCallback(
    (perm: string): boolean => {
      if (!user) return false;
      // Safety fallback: admin roles always have full access.
      // This also handles sessions created before the permissions field was added to the auth flow.
      if (user.userType === 'super_admin' || user.userType === 'client_admin') return true;
      const perms = user.permissions ?? [];
      if (perms.includes('*')) return true;
      return perms.includes(perm);
    },
    [user],
  );

  const isSuperAdmin = user?.userType === 'super_admin';
  const isClientAdmin = user?.userType === 'client_admin';
  const isClientUser = user?.userType === 'client_user';

  return (
    <AuthContext.Provider value={{
      user, token, login, logout,
      isAuthenticated: !!token,
      hasPermission,
      isSuperAdmin, isClientAdmin, isClientUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
