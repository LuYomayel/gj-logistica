import { apiClient } from '../../../shared/api/client';
import type { AuthUser, LoginResponse } from '../../../shared/types';

// El backend retorna { accessToken } (camelCase). Después de unwrap por el interceptor.
interface BackendLoginData {
  accessToken: string;
}

// El backend retorna el User completo en /auth/me
interface BackendUser {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  isAdmin: boolean;
  status: number;
}

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    // 1. Login → obtiene el token
    const { data: loginData } = await apiClient.post<BackendLoginData>(
      '/auth/login',
      { username, password },
    );

    const token = loginData.accessToken;

    // 2. Fetch perfil del usuario con el token recién obtenido
    const { data: userData } = await apiClient.get<BackendUser>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const user: AuthUser = {
      id: userData.id,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      isAdmin: userData.isAdmin,
    };

    return { access_token: token, user };
  },
};
