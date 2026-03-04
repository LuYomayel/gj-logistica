import { apiClient } from '../../../shared/api/client';
import type { Tenant, User, PaginatedResponse } from '../../../shared/types';

export interface CreateTenantDto {
  name: string;
  code: string;
  isActive?: boolean;
}

export interface UpdateTenantDto {
  name?: string;
  code?: string;
  isActive?: boolean;
}

export const tenantsApi = {
  list: async (): Promise<Tenant[]> => {
    const { data } = await apiClient.get<PaginatedResponse<Tenant>>('/tenants');
    return data.data;
  },

  get: async (id: number): Promise<Tenant> => {
    const { data } = await apiClient.get<Tenant>(`/tenants/${id}`);
    return data as unknown as Tenant;
  },

  create: async (dto: CreateTenantDto): Promise<Tenant> => {
    const { data } = await apiClient.post<Tenant>('/tenants', dto);
    return data as unknown as Tenant;
  },

  update: async (id: number, dto: UpdateTenantDto): Promise<Tenant> => {
    const { data } = await apiClient.patch<Tenant>(`/tenants/${id}`, dto);
    return data as unknown as Tenant;
  },

  deactivate: async (id: number): Promise<Tenant> => {
    const { data } = await apiClient.delete<Tenant>(`/tenants/${id}`);
    return data as unknown as Tenant;
  },

  activate: async (id: number): Promise<Tenant> => {
    const { data } = await apiClient.patch<Tenant>(`/tenants/${id}/activate`, {});
    return data as unknown as Tenant;
  },

  getUsers: async (id: number): Promise<User[]> => {
    const { data } = await apiClient.get<PaginatedResponse<User>>(`/tenants/${id}/users`);
    return data.data;
  },
};
