import { apiClient } from '../../../shared/api/client';
import type { StockAtDateItem, StockMovement, PaginatedResponse } from '../../../shared/types';

export interface StockAtDateFilters {
  date: string;
  warehouseId?: number;
  productId?: number;
}

export interface TransferPayload {
  fromWarehouseId?: number;
  toWarehouseId: number;
  productId: number;
  quantity: number;
  label?: string;
}

export interface CreateMovementPayload {
  warehouseId: number;
  productId: number;
  /** Positivo = entrada, negativo = salida */
  quantity: number;
  label?: string;
  inventoryCode?: string;
}

export const stockApi = {
  createMovement: async (payload: CreateMovementPayload): Promise<StockMovement> => {
    const { data } = await apiClient.post<{ data: StockMovement } | StockMovement>('/stock/movements', payload);
    return (data as { data: StockMovement }).data ?? (data as StockMovement);
  },

  getMovements: async (params: {
    warehouseId?: number;
    productId?: number;
    originType?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedResponse<StockMovement>> => {
    const { data } = await apiClient.get<PaginatedResponse<StockMovement>>('/stock/movements', { params });
    return data;
  },

  getAtDate: async (filters: StockAtDateFilters): Promise<StockAtDateItem[]> => {
    const { data } = await apiClient.get<StockAtDateItem[]>('/stock/at-date', { params: filters });
    // apiClient interceptor may wrap it; just return as array
    return Array.isArray(data) ? data : (data as unknown as { data: StockAtDateItem[] }).data ?? [];
  },

  transfer: async (payload: TransferPayload): Promise<StockMovement[]> => {
    const { data } = await apiClient.post<StockMovement[]>('/stock/transfer', payload);
    return Array.isArray(data) ? data : (data as unknown as { data: StockMovement[] }).data ?? [];
  },
};
