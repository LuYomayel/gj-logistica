import { useQuery } from '@tanstack/react-query';
import { tenantsApi } from '../../features/admin/api/tenantsApi';
import { useAuth } from './useAuth';

export function canManageTenants(userType: string | undefined): boolean {
  return userType === 'super_admin';
}

export function useTenants() {
  const { user } = useAuth();
  const enabled = canManageTenants(user?.userType);
  return useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantsApi.list(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
