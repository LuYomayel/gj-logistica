import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { TabView, TabPanel } from 'primereact/tabview';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Skeleton } from 'primereact/skeleton';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { permissionsApi } from '../api/permissionsApi';
import { usersApi } from '../../users/api/usersApi';
import { apiErrMsg } from '../../../shared/utils/apiErrMsg';
import { PermissionGroupDialog } from './PermissionGroupDialog';
import type { Permission, User } from '../../../shared/types';

const MODULE_LABELS: Record<string, string> = {
  users: 'Usuarios',
  third_parties: 'Terceros',
  contacts: 'Contactos',
  orders: 'Pedidos',
  products: 'Productos',
  stock: 'Stock / Almacenes',
  barcodes: 'Códigos de Barras',
  import: 'Importación',
  export: 'Exportación',
  tenants: 'Organizaciones',
};

const ACTION_LABELS: Record<string, string> = {
  read: 'Ver',
  write: 'Crear / Modificar',
  delete: 'Eliminar',
  export: 'Exportar',
  validate: 'Validar',
  send: 'Enviar',
  close: 'Cerrar',
  cancel: 'Anular',
  generate_docs: 'Generar documentos',
  read_permissions: 'Ver permisos',
  write_external: 'Crear externos',
  write_password: 'Cambiar contraseña',
  read_own_perms: 'Ver propios permisos',
  write_own_info: 'Modificar perfil',
  write_own_password: 'Cambiar propia contraseña',
  write_own_perms: 'Modificar propios permisos',
  read_groups: 'Ver grupos',
  read_group_perms: 'Ver permisos de grupos',
  write_groups: 'Crear / Modificar grupos',
  delete_groups: 'Eliminar grupos',
  write_payment: 'Gestionar pagos',
  expand_access: 'Acceso ampliado',
  read_prices: 'Ver precios',
  ignore_min_price: 'Ignorar precio mínimo',
  write_warehouses: 'Crear almacenes',
  delete_warehouses: 'Eliminar almacenes',
  read_movements: 'Ver movimientos',
  write_movements: 'Crear movimientos',
  read_inventories: 'Ver inventarios',
  write_inventories: 'Crear inventarios',
  generate: 'Generar',
  run: 'Ejecutar',
};

export function PermissionGroupDetail() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const qc = useQueryClient();
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [addMemberDialogVisible, setAddMemberDialogVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: group, isLoading: loadingGroup } = useQuery({
    queryKey: ['permission-groups', groupId],
    queryFn: () => permissionsApi.getGroup(groupId),
  });

  const { data: permissions = [], isLoading: loadingPerms } = useQuery({
    queryKey: ['group-permissions', groupId],
    queryFn: () => permissionsApi.getGroupPermissions(groupId),
  });

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => permissionsApi.getGroupMembers(groupId),
  });

  const { data: allUsers } = useQuery({
    queryKey: ['users', { page: 1, limit: 100 }],
    queryFn: () => usersApi.list({ limit: 100 }),
    select: (d) => d.data,
  });

  const addMemberMutation = useMutation({
    mutationFn: (userId: number) => permissionsApi.addMemberToGroup(groupId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['group-members', groupId] });
      toast.current?.show({ severity: 'success', summary: 'Agregado', detail: 'Miembro agregado', life: 3000 });
      setAddMemberDialogVisible(false);
      setSelectedUserId(null);
    },
    onError: (err) => toast.current?.show({ severity: 'error', summary: 'Error', detail: apiErrMsg(err, 'No se pudo agregar al grupo'), life: 4000 }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => permissionsApi.removeMemberFromGroup(groupId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['group-members', groupId] });
      toast.current?.show({ severity: 'success', summary: 'Quitado', detail: 'Miembro quitado del grupo', life: 3000 });
    },
    onError: (err) => toast.current?.show({ severity: 'error', summary: 'Error', detail: apiErrMsg(err, 'No se pudo quitar del grupo'), life: 4000 }),
  });

  const handleRemoveMember = (user: User) => {
    confirmDialog({
      message: `¿Quitar a "${user.username}" del grupo?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: () => removeMemberMutation.mutate(user.id),
    });
  };

  const availableUsers = allUsers?.filter((u) => !members.some((m) => m.id === u.id)) ?? [];

  if (loadingGroup) return <Skeleton height="400px" />;
  if (!group) return <div className="text-red-500">Grupo no encontrado</div>;

  return (
    <div className="flex flex-col gap-4">
      <Toast ref={toast} />
      <ConfirmDialog />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Button icon="pi pi-arrow-left" text onClick={() => navigate('/admin/permission-groups')} />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1b3a5f]">{group.name}</h1>
            {group.description && <p className="text-gray-500 text-sm">{group.description}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button label="Editar Grupo" icon="pi pi-pencil" outlined onClick={() => setEditDialogVisible(true)} />
        </div>
      </div>

      <TabView>
        <TabPanel header={`Permisos (${permissions.length})`}>
          {loadingPerms ? (
            <Skeleton height="200px" />
          ) : (
            <DataTable value={permissions} size="small" emptyMessage="No hay permisos asignados">
              <Column field="module" header="Módulo" style={{ width: '150px' }} body={(r: Permission) => MODULE_LABELS[r.module] ?? r.module} />
              <Column field="action" header="Acción" style={{ width: '180px' }} body={(r: Permission) => ACTION_LABELS[r.action] ?? r.action} />
              <Column field="label" header="Descripción" />
              <Column
                field="isAdvanced"
                header=""
                style={{ width: '80px' }}
                body={(r: Permission) => r.isAdvanced ? <Tag value="ADV" severity="warning" /> : null}
              />
            </DataTable>
          )}
        </TabPanel>

        <TabPanel header={`Miembros (${members.length})`}>
          <div className="flex justify-end mb-3">
            <Button label="Agregar Usuario" icon="pi pi-user-plus" size="small" onClick={() => setAddMemberDialogVisible(true)} />
          </div>
          {loadingMembers ? (
            <Skeleton height="200px" />
          ) : (
            <DataTable value={members} size="small" emptyMessage="No hay miembros en este grupo">
              <Column field="id" header="ID" style={{ width: '60px' }} />
              <Column field="username" header="Usuario" />
              <Column field="email" header="Email" body={(r: User) => r.email ?? '-'} />
              <Column
                field="userType"
                header="Tipo"
                style={{ width: '120px' }}
                body={(r: User) => <Tag value={r.userType} severity="secondary" />}
              />
              <Column
                header=""
                style={{ width: '80px' }}
                body={(r: User) => (
                  <Button icon="pi pi-user-minus" text size="small" severity="danger" tooltip="Quitar del grupo" tooltipOptions={{ position: 'left' }} onClick={() => handleRemoveMember(r)} />
                )}
              />
            </DataTable>
          )}
        </TabPanel>
      </TabView>

      {/* Add member dialog */}
      <Dialog
        header="Agregar Miembro"
        visible={addMemberDialogVisible}
        onHide={() => { setAddMemberDialogVisible(false); setSelectedUserId(null); }}
        footer={
          <div className="flex justify-end gap-2">
            <Button label="Cancelar" outlined severity="secondary" onClick={() => setAddMemberDialogVisible(false)} />
            <Button label="Agregar" icon="pi pi-check" disabled={!selectedUserId} loading={addMemberMutation.isPending} onClick={() => selectedUserId && addMemberMutation.mutate(selectedUserId)} />
          </div>
        }
        style={{ width: '380px' }}
      >
        <div className="flex flex-col gap-2 mt-2">
          <label className="text-sm font-medium text-gray-700">Seleccionar usuario</label>
          <Dropdown
            value={selectedUserId}
            options={availableUsers.map((u) => ({ label: `${u.username} ${u.email ? `(${u.email})` : ''}`, value: u.id }))}
            onChange={(e) => setSelectedUserId(e.value as number)}
            placeholder="Elegir usuario..."
            className="w-full"
            filter
          />
        </div>
      </Dialog>

      {/* Edit group dialog */}
      <PermissionGroupDialog
        visible={editDialogVisible}
        onHide={() => setEditDialogVisible(false)}
        group={group}
      />
    </div>
  );
}
