import { apiClient } from '../../../shared/api/client';
import type { Contact, PaginatedResponse } from '../../../shared/types';

export const contactsApi = {
  list: async (params: { page?: number; limit?: number; search?: string } = {}): Promise<PaginatedResponse<Contact>> => {
    const { data } = await apiClient.get<PaginatedResponse<Contact>>('/contacts', {
      params: { page: 1, limit: 20, ...params },
    });
    return data;
  },
  get: async (id: number): Promise<Contact> => {
    const { data } = await apiClient.get<Contact>(`/contacts/${id}`);
    return data;
  },
};
