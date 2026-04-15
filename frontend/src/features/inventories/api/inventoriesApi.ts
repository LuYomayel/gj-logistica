import { apiClient } from '../../../shared/api/client';
import type { Inventory, InventoryLine, PaginatedResponse } from '../../../shared/types';

export interface InventoryFilters {
  page?: number;
  limit?: number;
  warehouseId?: number;
  status?: number;
  tenantId?: number;
}

export interface CreateInventoryPayload {
  ref: string;
  label?: string;
  warehouseId?: number;
  productId?: number;
  inventoryDate?: string;
  tenantId?: number;
}

export interface AddLinePayload {
  warehouseId: number;
  productId: number;
  realQuantity: number;
}

export const inventoriesApi = {
  list: async (filters: InventoryFilters = {}): Promise<PaginatedResponse<Inventory>> => {
    const params = { page: 1, limit: 20, ...filters };
    const { data } = await apiClient.get<PaginatedResponse<Inventory>>('/inventories', { params });
    return data;
  },

  get: async (id: number): Promise<Inventory> => {
    const { data } = await apiClient.get<Inventory>(`/inventories/${id}`);
    return data;
  },

  create: async (payload: CreateInventoryPayload): Promise<Inventory> => {
    const { data } = await apiClient.post<Inventory>('/inventories', payload);
    return data;
  },

  addLine: async (inventoryId: number, payload: AddLinePayload): Promise<InventoryLine> => {
    const { data } = await apiClient.post<InventoryLine>(`/inventories/${inventoryId}/lines`, payload);
    return data;
  },

  updateLine: async (inventoryId: number, lineId: number, realQuantity: number): Promise<InventoryLine> => {
    const { data } = await apiClient.patch<InventoryLine>(
      `/inventories/${inventoryId}/lines/${lineId}`,
      { realQuantity },
    );
    return data;
  },

  removeLine: async (inventoryId: number, lineId: number): Promise<void> => {
    await apiClient.delete(`/inventories/${inventoryId}/lines/${lineId}`);
  },

  validate: async (inventoryId: number): Promise<Inventory> => {
    const { data } = await apiClient.post<Inventory>(`/inventories/${inventoryId}/validate`);
    return data;
  },

  resetToDraft: async (inventoryId: number): Promise<Inventory> => {
    const { data } = await apiClient.post<Inventory>(`/inventories/${inventoryId}/reset`);
    return data;
  },

  remove: async (inventoryId: number): Promise<void> => {
    await apiClient.delete(`/inventories/${inventoryId}`);
  },
};
