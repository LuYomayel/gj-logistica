import { apiClient } from '../../../shared/api/client';
import type { User, PaginatedResponse } from '../../../shared/types';

export const usersApi = {
  list: async (params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<User>> => {
    const { data } = await apiClient.get<PaginatedResponse<User>>('/users', {
      params: { page: 1, limit: 50, ...params },
    });
    return data;
  },
};
