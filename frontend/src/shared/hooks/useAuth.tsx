import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '../types';

/** Decode JWT payload without external libraries */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

/** Check if a JWT token is expired */
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true; // No exp claim = treat as expired for safety
  // exp is in seconds, Date.now() in milliseconds
  return Date.now() >= payload.exp * 1000;
}

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
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem('gj_token');
    // Auto-clear expired token on mount
    if (stored && isTokenExpired(stored)) {
      localStorage.removeItem('gj_token');
      localStorage.removeItem('gj_user');
      return null;
    }
    return stored;
  });
  const [user, setUser] = useState<AuthUser | null>(() => {
    const storedToken = localStorage.getItem('gj_token');
    // Don't load user if token is expired
    if (!storedToken || isTokenExpired(storedToken)) return null;
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

  // Check token validity (not just presence) for isAuthenticated
  const isAuthenticated = useMemo(() => {
    if (!token) return false;
    if (isTokenExpired(token)) {
      // Auto-logout on expired token detection
      logout();
      return false;
    }
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <AuthContext.Provider value={{
      user, token, login, logout,
      isAuthenticated,
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
