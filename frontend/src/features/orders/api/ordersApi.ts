import { apiClient } from '../../../shared/api/client';
import type { Order, OrderStats, OrderContact, PaginatedResponse } from '../../../shared/types';

export interface OrderFilters {
  page?: number;
  limit?: number;
  status?: number | string;
  thirdPartyId?: number;
  /** Solo respetado por el backend cuando el caller es super_admin. */
  tenantId?: number;
  ref?: string;
  dateFrom?: string;
  dateTo?: string;
  clientRef?: string;
}

export interface OrderStatsFilters {
  year?: number;
  thirdPartyId?: number;
  status?: number;
  createdByUserId?: number;
}

export interface CreateOrderPayload {
  thirdPartyId?: number;
  /** Solo lo envía super_admin; para otros usuarios el backend autoasigna su tenant. */
  tenantId?: number;
  warehouseId?: number;
  clientRef?: string;
  publicNote?: string;
  privateNote?: string;
  orderDate?: string;
  deliveryDate?: string;
}

export interface AddOrderLinePayload {
  productId?: number;
  label?: string;
  description?: string;
  quantity: number;
  unitPrice?: number;
  discountPercent?: number;
}

export const ordersApi = {
  list: async (filters: OrderFilters = {}): Promise<PaginatedResponse<Order>> => {
    const params = { page: 1, limit: 20, ...filters };
    const { data } = await apiClient.get<PaginatedResponse<Order>>('/orders', { params });
    return data;
  },
  get: async (id: number): Promise<Order> => {
    const { data } = await apiClient.get<Order>(`/orders/${id}`);
    return data;
  },
  create: async (payload: CreateOrderPayload): Promise<Order> => {
    const { data } = await apiClient.post<Order>('/orders', payload);
    return data;
  },
  update: async (id: number, payload: Partial<CreateOrderPayload>): Promise<Order> => {
    const { data } = await apiClient.patch<Order>(`/orders/${id}`, payload);
    return data;
  },
  addLine: async (id: number, payload: AddOrderLinePayload): Promise<Order> => {
    const { data } = await apiClient.post<Order>(`/orders/${id}/lines`, payload);
    return data;
  },
  removeLine: async (id: number, lineId: number): Promise<Order> => {
    const { data } = await apiClient.patch<Order>(`/orders/${id}/lines/${lineId}/remove`);
    return data;
  },
  validate: async (id: number): Promise<Order> => {
    const { data } = await apiClient.post<Order>(`/orders/${id}/validate`);
    return data;
  },
  cancel: async (id: number): Promise<Order> => {
    const { data } = await apiClient.post<Order>(`/orders/${id}/cancel`);
    return data;
  },
  ship: async (id: number): Promise<Order> => {
    const { data } = await apiClient.post<Order>(`/orders/${id}/ship`);
    return data;
  },
  progress: async (id: number): Promise<Order> => {
    const { data } = await apiClient.post<Order>(`/orders/${id}/progress`);
    return data;
  },
  getStats: async (filters: OrderStatsFilters = {}): Promise<OrderStats> => {
    const { data } = await apiClient.get('/orders/stats', { params: filters });
    return data as unknown as OrderStats;
  },
  close: async (id: number): Promise<Order> => {
    const { data } = await apiClient.post<Order>(`/orders/${id}/ship`);
    return data;
  },
  reopen: async (id: number): Promise<Order> => {
    const { data } = await apiClient.post<Order>(`/orders/${id}/reopen`);
    return data;
  },
  clone: async (id: number): Promise<Order> => {
    const { data } = await apiClient.post<Order>(`/orders/${id}/clone`);
    return data;
  },
  exportCsv: async (filters: OrderFilters = {}): Promise<void> => {
    const params = { ...filters };
    const resp = await apiClient.get('/orders/export', { params, responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([resp.data as BlobPart], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pedidos.csv';
    a.click();
    URL.revokeObjectURL(url);
  },
  downloadPdf: async (id: number, ref: string): Promise<void> => {
    const resp = await apiClient.get(`/orders/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([resp.data as BlobPart], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ref}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
  // ── Order Contacts ──
  getContacts: async (orderId: number): Promise<OrderContact[]> => {
    const { data } = await apiClient.get<OrderContact[]>(`/orders/${orderId}/contacts`);
    return Array.isArray(data) ? data : ((data as Record<string, unknown>)?.data as OrderContact[] ?? []);
  },
  assignContact: async (orderId: number, contactId: number, role?: string): Promise<OrderContact> => {
    const { data } = await apiClient.post<OrderContact>(`/orders/${orderId}/contacts`, { contactId, role });
    return data;
  },
  removeContact: async (orderId: number, contactId: number): Promise<void> => {
    await apiClient.delete(`/orders/${orderId}/contacts/${contactId}`);
  },
};
