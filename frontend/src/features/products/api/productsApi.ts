import { apiClient } from '../../../shared/api/client';
import type { Product, ProductStats, PaginatedResponse } from '../../../shared/types';

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  rubro?: string;
  marca?: string;
  ref?: string;
  tenantId?: number;
}

export interface ProductStatsFilters {
  year?: number;
  thirdPartyId?: number;
  productId?: number;
}

export interface CreateProductPayload {
  ref: string;
  label?: string;
  description?: string;
  barcode?: string;
  talle?: string;
  rubro?: string;
  subrubro?: string;
  marca?: string;
  color?: string;
  posicion?: string;
  tenantId?: number;
}

export const productsApi = {
  list: async (filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> => {
    const params = { page: 1, limit: 20, ...filters };
    const { data } = await apiClient.get<PaginatedResponse<Product>>('/products', { params });
    return data;
  },
  get: async (id: number): Promise<Product> => {
    const { data } = await apiClient.get<Product>(`/products/${id}`);
    return data;
  },
  create: async (payload: CreateProductPayload): Promise<Product> => {
    const { data } = await apiClient.post<Product>('/products', payload);
    return data;
  },
  update: async (id: number, payload: Partial<CreateProductPayload>): Promise<Product> => {
    const { data } = await apiClient.patch<Product>(`/products/${id}`, payload);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },
  getLowStock: async (): Promise<Product[]> => {
    const { data } = await apiClient.get('/products/low-stock');
    // Interceptor wraps arrays into { data, total, page, limit } — unwrap
    return Array.isArray(data) ? data : ((data as Record<string, unknown>)?.data as Product[] ?? []);
  },
  getStats: async (filters: ProductStatsFilters = {}): Promise<ProductStats> => {
    const { data } = await apiClient.get('/products/stats', { params: filters });
    // Backend returns the object directly (not paginated)
    return data as unknown as ProductStats;
  },
  exportCsv: async (): Promise<void> => {
    const resp = await apiClient.get('/products/export', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([resp.data as BlobPart], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'productos.csv';
    a.click();
    URL.revokeObjectURL(url);
  },
  importExcel: async (file: File): Promise<{ created: number; updated: number; errors: string[] }> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post<{ created: number; updated: number; errors: string[] }>(
      '/products/import',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data as unknown as { created: number; updated: number; errors: string[] };
  },
};
