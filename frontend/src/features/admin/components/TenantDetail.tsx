import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { TabView, TabPanel } from 'primereact/tabview';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Skeleton } from 'primereact/skeleton';
import { tenantsApi } from '../api/tenantsApi';
import { permissionsApi } from '../api/permissionsApi';
import { CreateUserDialog } from '../../users/components/CreateUserDialog';
import type { User, PermissionGroup } from '../../../shared/types';

const USER_TYPE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  client_admin: 'Admin',
  client_user: 'Usuario',
};

const USER_TYPE_SEVERITY: Record<string, 'warning' | 'info' | 'secondary'> = {
  super_admin: 'warning',
  client_admin: 'info',
  client_user: 'secondary',
};

export function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const tenantId = Number(id);
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const qc = useQueryClient();
  const [createUserVisible, setCreateUserVisible] = useState(false);

  const { data: tenant, isLoading: loadingTenant } = useQuery({
    queryKey: ['tenants', tenantId],
    queryFn: () => tenantsApi.get(tenantId),
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['tenants', tenantId, 'users'],
    queryFn: () => tenantsApi.getUsers(tenantId),
  });

  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['permission-groups'],
    queryFn: permissionsApi.listGroups,
    select: (all) => all.filter((g) => g.tenantId === tenantId),
  });

  if (loadingTenant) return <Skeleton height="400px" />;
  if (!tenant) return <div className="text-red-500">Organización no encontrada</div>;

  return (
    <div className="flex flex-col gap-4">
      <Toast ref={toast} />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Button icon="pi pi-arrow-left" text onClick={() => navigate('/admin/organizaciones')} />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1b3a5f]">{tenant.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <code className="bg-gray-100 px-1 rounded text-xs">{tenant.code}</code>
              <Tag value={tenant.isActive ? 'Activo' : 'Inactivo'} severity={tenant.isActive ? 'success' : 'danger'} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <TabView>
        <TabPanel header={`Usuarios (${users.length})`}>
          <div className="flex justify-end mb-3">
            <Button
              label="Nuevo Usuario"
              icon="pi pi-user-plus"
              size="small"
              onClick={() => setCreateUserVisible(true)}
            />
          </div>
          {loadingUsers ? (
            <Skeleton height="200px" />
          ) : (
            <DataTable value={users} size="small" emptyMessage="No hay usuarios en esta organización" scrollable>
              <Column field="id" header="ID" style={{ width: '60px' }} />
              <Column field="username" header="Usuario" />
              <Column field="firstName" header="Nombre" body={(r: User) => `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || '-'} />
              <Column field="email" header="Email" body={(r: User) => r.email ?? '-'} />
              <Column
                field="userType"
                header="Tipo"
                style={{ width: '120px' }}
                body={(r: User) => (
                  <Tag
                    value={USER_TYPE_LABEL[r.userType] ?? r.userType}
                    severity={USER_TYPE_SEVERITY[r.userType] ?? 'secondary'}
                  />
                )}
              />
              <Column
                field="status"
                header="Estado"
                style={{ width: '100px' }}
                body={(r: User) => <Tag value={r.status === 1 ? 'Activo' : 'Inactivo'} severity={r.status === 1 ? 'success' : 'danger'} />}
              />
            </DataTable>
          )}
        </TabPanel>

        <TabPanel header={`Grupos de Permisos (${groups.length})`}>
          {loadingGroups ? (
            <Skeleton height="200px" />
          ) : (
            <DataTable value={groups} size="small" emptyMessage="No hay grupos para esta organización" scrollable>
              <Column field="id" header="ID" style={{ width: '60px' }} />
              <Column field="name" header="Nombre" />
              <Column field="description" header="Descripción" body={(r: PermissionGroup) => r.description ?? '-'} />
              <Column
                field="isActive"
                header="Estado"
                style={{ width: '100px' }}
                body={(r: PermissionGroup) => <Tag value={r.isActive ? 'Activo' : 'Inactivo'} severity={r.isActive ? 'success' : 'danger'} />}
              />
              <Column
                header=""
                style={{ width: '80px' }}
                body={(r: PermissionGroup) => (
                  <Button icon="pi pi-arrow-right" text size="small" onClick={() => navigate(`/admin/permission-groups/${r.id}`)} />
                )}
              />
            </DataTable>
          )}
        </TabPanel>
      </TabView>

      <CreateUserDialog
        visible={createUserVisible}
        onHide={() => setCreateUserVisible(false)}
        tenantId={tenantId}
        onCreated={() => void qc.invalidateQueries({ queryKey: ['tenants', tenantId, 'users'] })}
      />
    </div>
  );
}
