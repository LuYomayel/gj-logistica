import { apiClient } from '../../../shared/api/client';
import type { Warehouse, ProductStock, PaginatedResponse } from '../../../shared/types';

export interface CreateWarehousePayload {
  name: string;
  shortName?: string;
  description?: string;
  location?: string;
  address?: string;
  phone?: string;
  status?: number;
  tenantId?: number;
}

export type UpdateWarehousePayload = Partial<CreateWarehousePayload>;

export const warehousesApi = {
  list: async (params?: { tenantId?: number }): Promise<PaginatedResponse<Warehouse>> => {
    const { data } = await apiClient.get<PaginatedResponse<Warehouse>>('/warehouses', {
      params: { page: 1, limit: 100, tenantId: params?.tenantId },
    });
    return data;
  },

  get: async (id: number): Promise<Warehouse> => {
    const { data } = await apiClient.get<Warehouse>(`/warehouses/${id}`);
    return data;
  },

  create: async (payload: CreateWarehousePayload): Promise<Warehouse> => {
    const { data } = await apiClient.post<Warehouse>('/warehouses', payload);
    return data;
  },

  update: async (id: number, payload: UpdateWarehousePayload): Promise<Warehouse> => {
    const { data } = await apiClient.patch<Warehouse>(`/warehouses/${id}`, payload);
    return data;
  },

  getStock: async (id: number): Promise<ProductStock[]> => {
    const { data } = await apiClient.get<ProductStock[]>(`/warehouses/${id}/stock`);
    return Array.isArray(data) ? data : (data as unknown as { data: ProductStock[] }).data ?? [];
  },
};
