import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import type { ReactNode } from "react";
import type { AuthUser } from "../types";
import { authApi } from "../../features/auth/api/authApi";

/** Decode JWT payload without external libraries */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split(".");
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
  /** Re-fetch /auth/me and update permissions + user data in-place (no re-login needed) */
  refreshUser: () => Promise<void>;
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
    const stored = localStorage.getItem("gj_token");
    // Auto-clear expired token on mount
    if (stored && isTokenExpired(stored)) {
      localStorage.removeItem("gj_token");
      localStorage.removeItem("gj_user");
      return null;
    }
    return stored;
  });
  const [user, setUser] = useState<AuthUser | null>(() => {
    const storedToken = localStorage.getItem("gj_token");
    // Don't load user if token is expired
    if (!storedToken || isTokenExpired(storedToken)) return null;
    const stored = localStorage.getItem("gj_user");
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  });

  const login = (t: string, u: AuthUser) => {
    localStorage.setItem("gj_token", t);
    localStorage.setItem("gj_user", JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const logout = useCallback(() => {
    localStorage.removeItem("gj_token");
    localStorage.removeItem("gj_user");
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token || isTokenExpired(token)) return;
    try {
      const freshUser = await authApi.fetchMe();
      localStorage.setItem("gj_user", JSON.stringify(freshUser));
      setUser(freshUser);
    } catch {
      // If /auth/me fails (401, network error), don't crash — interceptor handles 401
    }
  }, [token]);

  // Auto-refresh permissions when the user comes back to the tab
  const refreshUserRef = useRef(refreshUser);
  refreshUserRef.current = refreshUser;

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshUserRef.current();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Permissions that require explicit assignment even for client_admin.
  // Only super_admin bypasses these automatically.
  const RESTRICTED_PERMISSIONS = ["products.read_position"];

  const hasPermission = useCallback(
    (perm: string): boolean => {
      if (!user) return false;
      // super_admin always has full access to everything

      if (user.userType === "super_admin") return true;
      if (perm === "products.read_position") return false;
      // client_admin has full access EXCEPT restricted permissions
      if (
        user.userType === "client_admin" &&
        !RESTRICTED_PERMISSIONS.includes(perm)
      )
        return true;

      const perms = user.permissions ?? [];
      console.log("perms", perms, perm);
      if (perms.includes("*")) return true;
      return perms.includes(perm);
    },
    [user],
  );

  const isSuperAdmin = user?.userType === "super_admin";
  const isClientAdmin = user?.userType === "client_admin";
  const isClientUser = user?.userType === "client_user";

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
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        refreshUser,
        isAuthenticated,
        hasPermission,
        isSuperAdmin,
        isClientAdmin,
        isClientUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
