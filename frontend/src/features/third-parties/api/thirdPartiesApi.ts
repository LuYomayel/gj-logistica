import { apiClient } from '../../../shared/api/client';
import type { ThirdParty, PaginatedResponse } from '../../../shared/types';

export interface ThirdPartyFilters {
  page?: number;
  limit?: number;
  search?: string;
}

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
};
