import { apiClient } from '../../../shared/api/client';
import type { User, PaginatedResponse, UserType } from '../../../shared/types';

export interface CreateUserDto {
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  userType?: UserType;
  entity?: number;  // tenantId
  isAdmin?: boolean;
  supervisorId?: number;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  userType?: UserType;
  entity?: number;
  isAdmin?: boolean;
  status?: number;
}

export const usersApi = {
  list: async (params: { page?: number; limit?: number; tenantId?: number } = {}): Promise<PaginatedResponse<User>> => {
    const { data } = await apiClient.get<PaginatedResponse<User>>('/users', {
      params: { page: 1, limit: 50, ...params },
    });
    return data;
  },

  get: async (id: number): Promise<User> => {
    const { data } = await apiClient.get<User>(`/users/${id}`);
    return data as unknown as User;
  },

  create: async (dto: CreateUserDto): Promise<User> => {
    const { data } = await apiClient.post<User>('/users', dto);
    return data as unknown as User;
  },

  update: async (id: number, dto: UpdateUserDto): Promise<User> => {
    const { data } = await apiClient.patch<User>(`/users/${id}`, dto);
    return data as unknown as User;
  },

  deactivate: async (id: number): Promise<User> => {
    const { data } = await apiClient.delete<User>(`/users/${id}`);
    return data as unknown as User;
  },

  activate: async (id: number): Promise<User> => {
    const { data } = await apiClient.patch<User>(`/users/${id}/activate`, {});
    return data as unknown as User;
  },

  changePassword: async (
    id: number,
    dto: { currentPassword?: string; newPassword: string },
  ): Promise<void> => {
    await apiClient.patch(`/users/${id}/change-password`, dto);
  },
};
