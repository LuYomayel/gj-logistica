import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import type { DataTablePageEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { usersApi } from '../api/usersApi';
import { useAuth } from '../../../shared/hooks/useAuth';
import type { User } from '../../../shared/types';
import { UserPermissionsPanel } from '../../admin/components/UserPermissionsPanel';
import { CreateUserDialog } from './CreateUserDialog';
import { ChangePasswordDialog } from './ChangePasswordDialog';

export function UsersTable() {
  const toast = useRef<Toast>(null);
  const qc = useQueryClient();
  const { hasPermission, user: authUser } = useAuth();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [permUser, setPermUser] = useState<User | null>(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [pwdTarget, setPwdTarget] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, limit }],
    queryFn: () => usersApi.list({ page, limit }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => usersApi.deactivate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      toast.current?.show({ severity: 'success', summary: 'Usuario desactivado', life: 3000 });
    },
    onError: () => {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudo desactivar', life: 4000 });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => usersApi.activate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      toast.current?.show({ severity: 'success', summary: 'Usuario activado', life: 3000 });
    },
    onError: () => {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudo activar', life: 4000 });
    },
  });

  const confirmDeactivate = (user: User) => {
    confirmDialog({
      message: `¿Desactivar a ${user.firstName ?? ''} ${user.lastName ?? user.username}?`,
      header: 'Confirmar desactivación',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      acceptLabel: 'Desactivar',
      rejectLabel: 'Cancelar',
      accept: () => deactivateMutation.mutate(user.id),
    });
  };

  const users = data?.data ?? [];
  const total = data?.total ?? 0;

  const onPage = (e: DataTablePageEvent) => {
    setPage((e.page ?? 0) + 1);
    setLimit(e.rows ?? 50);
  };

  if (isLoading) {
    return <Skeleton height="400px" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Toast ref={toast} />
      <ConfirmDialog />
      <ChangePasswordDialog
        visible={!!pwdTarget}
        onHide={() => setPwdTarget(null)}
        targetUser={pwdTarget}
        isSelf={pwdTarget?.id === authUser?.id}
      />
      {/* Title + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1b3a5f]">Usuarios y Grupos</h1>
          <p className="text-gray-500 text-sm">{total} usuarios en total</p>
        </div>
        {hasPermission('users.write') && (
          <Button label="Nuevo Usuario" icon="pi pi-user-plus" onClick={() => setCreateVisible(true)} />
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <DataTable
          value={users}
          lazy
          paginator
          scrollable
          rows={limit}
          totalRecords={total}
          first={(page - 1) * limit}
          onPage={onPage}
          rowsPerPageOptions={[10, 50, 100]}
          size="small"
          emptyMessage="No se encontraron usuarios"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        >
          <Column
            field="lastName"
            header="Apellido"
            style={{ width: '150px' }}
            body={(row: User) => row.lastName ?? '-'}
          />
          <Column
            field="firstName"
            header="Nombre"
            style={{ width: '150px' }}
            body={(row: User) => row.firstName ?? '-'}
          />
          <Column field="username" header="Usuario" style={{ width: '150px' }} />
          <Column
            field="email"
            header="Email"
            body={(row: User) =>
              row.email ? (
                <a href={`mailto:${row.email}`} className="text-blue-600 hover:underline">
                  {row.email}
                </a>
              ) : (
                '-'
              )
            }
          />
          <Column
            field="phone"
            header="Teléfono"
            style={{ width: '140px' }}
            body={(row: User) => row.phone ?? '-'}
          />
          <Column
            field="isAdmin"
            header="Admin"
            style={{ width: '80px', textAlign: 'center' }}
            bodyStyle={{ textAlign: 'center' }}
            body={(row: User) =>
              row.isAdmin ? (
                <Tag value="Admin" severity="warning" />
              ) : (
                <span className="text-gray-400 text-xs">—</span>
              )
            }
          />
          <Column
            field="status"
            header="Estado"
            style={{ width: '100px', textAlign: 'center' }}
            bodyStyle={{ textAlign: 'center' }}
            body={(row: User) => (
              <Tag
                value={row.status === 1 ? 'Activo' : 'Inactivo'}
                severity={row.status === 1 ? 'success' : 'danger'}
              />
            )}
          />
          <Column
            field="groups"
            header="Grupos"
            body={(row: User) =>
              row.groups?.length ? row.groups.map((g) => g.name).join(', ') : '-'
            }
          />
          <Column
            field="userType"
            header="Tipo"
            style={{ width: '110px' }}
            body={(row: User) => {
              const map: Record<string, { label: string; severity: 'warning' | 'info' | 'secondary' }> = {
                super_admin: { label: 'Super Admin', severity: 'warning' },
                client_admin: { label: 'Admin', severity: 'info' },
                client_user: { label: 'Usuario', severity: 'secondary' },
              };
              const conf = map[row.userType] ?? { label: row.userType, severity: 'secondary' as const };
              return <Tag value={conf.label} severity={conf.severity} />;
            }}
          />
          <Column
            field="entity"
            header="Tenant"
            style={{ width: '80px', textAlign: 'center' }}
            bodyStyle={{ textAlign: 'center' }}
            body={(row: User) => <span className="text-xs text-gray-500">#{row.entity}</span>}
          />
          {hasPermission('users.write') && (
            <Column
              header="Acción"
              style={{ width: '120px', textAlign: 'center' }}
              bodyStyle={{ textAlign: 'center' }}
              body={(row: User) =>
                row.status === 1 ? (
                  <Button
                    icon="pi pi-user-minus"
                    text
                    size="small"
                    severity="danger"
                    tooltip="Desactivar usuario"
                    tooltipOptions={{ position: 'left' }}
                    loading={deactivateMutation.isPending && deactivateMutation.variables === row.id}
                    onClick={(e) => { e.stopPropagation(); confirmDeactivate(row); }}
                  />
                ) : (
                  <Button
                    icon="pi pi-user-plus"
                    text
                    size="small"
                    severity="success"
                    tooltip="Reactivar usuario"
                    tooltipOptions={{ position: 'left' }}
                    loading={activateMutation.isPending && activateMutation.variables === row.id}
                    onClick={(e) => { e.stopPropagation(); activateMutation.mutate(row.id); }}
                  />
                )
              }
            />
          )}
          {/* Password change — visible to: self (always) or admin with users.write_password */}
          <Column
            header="Contraseña"
            style={{ width: '90px', textAlign: 'center' }}
            bodyStyle={{ textAlign: 'center' }}
            body={(row: User) => {
              const canChange = row.id === authUser?.id || hasPermission('users.write_password');
              if (!canChange) return null;
              return (
                <Button
                  icon="pi pi-key"
                  text
                  size="small"
                  severity="secondary"
                  tooltip={row.id === authUser?.id ? 'Cambiar mi contraseña' : 'Cambiar contraseña'}
                  tooltipOptions={{ position: 'left' }}
                  onClick={(e) => { e.stopPropagation(); setPwdTarget(row); }}
                />
              );
            }}
          />
          <Column
            header="Permisos"
            style={{ width: '100px', textAlign: 'center' }}
            bodyStyle={{ textAlign: 'center' }}
            body={(row: User) => (
              <Button
                icon="pi pi-shield"
                text
                size="small"
                tooltip="Gestionar permisos"
                tooltipOptions={{ position: 'left' }}
                onClick={(e) => { e.stopPropagation(); setPermUser(row); }}
              />
            )}
          />
        </DataTable>
      </div>

      <UserPermissionsPanel user={permUser} onHide={() => setPermUser(null)} />
      <CreateUserDialog
        visible={createVisible}
        onHide={() => setCreateVisible(false)}
      />
    </div>
  );
}
