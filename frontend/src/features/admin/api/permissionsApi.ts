import { apiClient } from '../../../shared/api/client';
import type {
  Permission,
  PermissionGroup,
  User,
  UserPermissionOverride,
  EffectivePermissions,
  PaginatedResponse,
} from '../../../shared/types';

export interface CreatePermissionGroupDto {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdatePermissionGroupDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface SetUserPermissionDto {
  permissionId: number;
  granted: boolean;
}

export const permissionsApi = {
  // ── Catalog ──────────────────────────────────────────────────────────────
  getCatalog: async (): Promise<Record<string, Permission[]>> => {
    const { data } = await apiClient.get<Record<string, Permission[]>>('/permissions');
    // The apiClient interceptor might wrap this; handle both cases
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as unknown as Record<string, Permission[]>;
    }
    return data as unknown as Record<string, Permission[]>;
  },

  // ── Permission Groups ─────────────────────────────────────────────────────
  listGroups: async (): Promise<PermissionGroup[]> => {
    const { data } = await apiClient.get<PaginatedResponse<PermissionGroup>>('/permission-groups');
    return data.data;
  },

  getGroup: async (id: number): Promise<PermissionGroup> => {
    const { data } = await apiClient.get<PermissionGroup>(`/permission-groups/${id}`);
    return data as unknown as PermissionGroup;
  },

  createGroup: async (dto: CreatePermissionGroupDto): Promise<PermissionGroup> => {
    const { data } = await apiClient.post<PermissionGroup>('/permission-groups', dto);
    return data as unknown as PermissionGroup;
  },

  updateGroup: async (id: number, dto: UpdatePermissionGroupDto): Promise<PermissionGroup> => {
    const { data } = await apiClient.patch<PermissionGroup>(`/permission-groups/${id}`, dto);
    return data as unknown as PermissionGroup;
  },

  deleteGroup: async (id: number): Promise<void> => {
    await apiClient.delete(`/permission-groups/${id}`);
  },

  // ── Group Permissions ─────────────────────────────────────────────────────
  getGroupPermissions: async (groupId: number): Promise<Permission[]> => {
    const { data } = await apiClient.get<PaginatedResponse<Permission>>(
      `/permission-groups/${groupId}/permissions`,
    );
    return data.data;
  },

  addPermissionToGroup: async (groupId: number, permId: number): Promise<void> => {
    await apiClient.post(`/permission-groups/${groupId}/permissions/${permId}`);
  },

  removePermissionFromGroup: async (groupId: number, permId: number): Promise<void> => {
    await apiClient.delete(`/permission-groups/${groupId}/permissions/${permId}`);
  },

  // ── Group Members ─────────────────────────────────────────────────────────
  getGroupMembers: async (groupId: number): Promise<User[]> => {
    const { data } = await apiClient.get<PaginatedResponse<User>>(
      `/permission-groups/${groupId}/members`,
    );
    return data.data;
  },

  addMemberToGroup: async (groupId: number, userId: number): Promise<void> => {
    await apiClient.post(`/permission-groups/${groupId}/members`, { userId });
  },

  removeMemberFromGroup: async (groupId: number, userId: number): Promise<void> => {
    await apiClient.delete(`/permission-groups/${groupId}/members/${userId}`);
  },

  // ── User Permissions ──────────────────────────────────────────────────────
  getUserEffectivePermissions: async (userId: number): Promise<EffectivePermissions> => {
    const { data } = await apiClient.get<EffectivePermissions>(`/users/${userId}/permissions`);
    return data as unknown as EffectivePermissions;
  },

  setUserPermission: async (
    userId: number,
    dto: SetUserPermissionDto,
  ): Promise<UserPermissionOverride> => {
    const { data } = await apiClient.post<UserPermissionOverride>(
      `/users/${userId}/permissions`,
      dto,
    );
    return data as unknown as UserPermissionOverride;
  },

  removeUserPermission: async (userId: number, permId: number): Promise<void> => {
    await apiClient.delete(`/users/${userId}/permissions/${permId}`);
  },
};
