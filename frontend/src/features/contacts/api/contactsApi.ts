import { apiClient } from '../../../shared/api/client';
import type { Contact, PaginatedResponse } from '../../../shared/types';

export interface ContactFilters {
  page?: number;
  limit?: number;
  search?: string;
  thirdPartyId?: number;
  tenantId?: number;
}

export interface CreateContactPayload {
  firstName: string;
  lastName: string;
  tenantId?: number;
  thirdPartyId?: number;
  email?: string;
  phonePro?: string;
  phoneMobile?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  alias?: string;
  marca?: string;
  dni?: number;
  lugarDeEntrega?: string;
  nombreFantasia?: string;
}

export type UpdateContactPayload = Partial<CreateContactPayload>;

export const contactsApi = {
  list: async (params: ContactFilters = {}): Promise<PaginatedResponse<Contact>> => {
    const { data } = await apiClient.get<PaginatedResponse<Contact>>('/contacts', {
      params: { page: 1, limit: 20, ...params },
    });
    return data;
  },
  get: async (id: number): Promise<Contact> => {
    const { data } = await apiClient.get<Contact>(`/contacts/${id}`);
    return data;
  },
  create: async (payload: CreateContactPayload): Promise<Contact> => {
    const { data } = await apiClient.post<Contact>('/contacts', payload);
    return data;
  },
  update: async (id: number, payload: UpdateContactPayload): Promise<Contact> => {
    const { data } = await apiClient.patch<Contact>(`/contacts/${id}`, payload);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/contacts/${id}`);
  },
  deactivate: async (id: number): Promise<Contact> => {
    const { data } = await apiClient.post<Contact>(`/contacts/${id}/deactivate`);
    return data;
  },
  activate: async (id: number): Promise<Contact> => {
    const { data } = await apiClient.post<Contact>(`/contacts/${id}/activate`);
    return data;
  },
};
