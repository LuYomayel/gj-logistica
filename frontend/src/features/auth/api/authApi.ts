import { apiClient } from '../../../shared/api/client';
import type { AuthUser, LoginResponse, UserType } from '../../../shared/types';

// El backend retorna { accessToken } (camelCase). Después de unwrap por el interceptor.
interface BackendLoginData {
  accessToken: string;
}

// El backend retorna el AuthenticatedUser completo en /auth/me
// (misma forma que JwtStrategy.validate() — includes permissions)
interface BackendMe {
  id: number;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string | null;
  isAdmin: boolean;
  userType: UserType;
  tenantId: number | null;
  permissions: string[];
}

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    // 1. Login → obtiene el token
    const { data: loginData } = await apiClient.post<BackendLoginData>(
      '/auth/login',
      { username, password },
    );

    const token = loginData.accessToken;

    // 2. Fetch perfil con permisos efectivos (JwtStrategy ya los calcula)
    const { data: me } = await apiClient.get<BackendMe>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const user: AuthUser = {
      id: me.id,
      username: me.username,
      firstName: me.firstName ?? null,
      lastName: me.lastName ?? null,
      email: me.email,
      isAdmin: me.isAdmin,
      userType: me.userType ?? 'client_user',
      tenantId: me.tenantId,
      permissions: me.permissions ?? [],
    };

    return { access_token: token, user };
  },

  /** Fetch current user profile + permissions (uses existing JWT from interceptor) */
  fetchMe: async (): Promise<AuthUser> => {
    const { data: me } = await apiClient.get<BackendMe>('/auth/me');

    return {
      id: me.id,
      username: me.username,
      firstName: me.firstName ?? null,
      lastName: me.lastName ?? null,
      email: me.email,
      isAdmin: me.isAdmin,
      userType: me.userType ?? 'client_user',
      tenantId: me.tenantId,
      permissions: me.permissions ?? [],
    };
  },
};
