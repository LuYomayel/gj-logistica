import { apiClient } from '../../../shared/api/client';
import type { ThirdParty, PaginatedResponse } from '../../../shared/types';

export interface ThirdPartyFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateThirdPartyPayload {
  name: string;
  clientCode?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  countryId?: number;
  provinceId?: number;
  website?: string;
  notes?: string;
}

export type UpdateThirdPartyPayload = Partial<CreateThirdPartyPayload> & { status?: number };

export const thirdPartiesApi = {
  list: async (filters: ThirdPartyFilters = {}): Promise<PaginatedResponse<ThirdParty>> => {
    const params = { page: 1, limit: 100, ...filters };
    const { data } = await apiClient.get<PaginatedResponse<ThirdParty>>('/third-parties', { params });
    return data;
  },
  get: async (id: number): Promise<ThirdParty> => {
    const { data } = await apiClient.get<ThirdParty>(`/third-parties/${id}`);
    return data;
  },
  create: async (payload: CreateThirdPartyPayload): Promise<ThirdParty> => {
    const { data } = await apiClient.post<ThirdParty>('/third-parties', payload);
    return data;
  },
  update: async (id: number, payload: UpdateThirdPartyPayload): Promise<ThirdParty> => {
    const { data } = await apiClient.patch<ThirdParty>(`/third-parties/${id}`, payload);
    return data;
  },
};
