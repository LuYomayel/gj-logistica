import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Dropdown } from 'primereact/dropdown';
import { TabView, TabPanel } from 'primereact/tabview';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Skeleton } from 'primereact/skeleton';
import { permissionsApi } from '../api/permissionsApi';
import type { User, PermissionGroup } from '../../../shared/types';

interface Props {
  user: User | null;
  onHide: () => void;
}

export function UserPermissionsPanel({ user, onHide }: Props) {
  const toast = useRef<Toast>(null);
  const qc = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const { data: effectiveData, isLoading: loadingEffective } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: () => permissionsApi.getUserEffectivePermissions(user!.id),
    enabled: !!user,
  });

  const { data: allGroups = [] } = useQuery({
    queryKey: ['permission-groups'],
    queryFn: permissionsApi.listGroups,
    enabled: !!user,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['user-group-memberships', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const results: PermissionGroup[] = [];
      for (const g of allGroups) {
        const groupMembers = await permissionsApi.getGroupMembers(g.id);
        if (groupMembers.some((m) => m.id === user.id)) results.push(g);
      }
      return results;
    },
    enabled: !!user && allGroups.length > 0,
  });

  const addToGroupMutation = useMutation({
    mutationFn: (groupId: number) => permissionsApi.addMemberToGroup(groupId, user!.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['user-group-memberships', user?.id] });
      void qc.invalidateQueries({ queryKey: ['user-permissions', user?.id] });
      toast.current?.show({ severity: 'success', summary: 'Agregado', detail: 'Usuario agregado al grupo', life: 3000 });
      setSelectedGroupId(null);
    },
    onError: () => toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudo agregar', life: 4000 }),
  });

  const removeFromGroupMutation = useMutation({
    mutationFn: (groupId: number) => permissionsApi.removeMemberFromGroup(groupId, user!.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['user-group-memberships', user?.id] });
      void qc.invalidateQueries({ queryKey: ['user-permissions', user?.id] });
      toast.current?.show({ severity: 'success', summary: 'Quitado', detail: 'Usuario quitado del grupo', life: 3000 });
    },
    onError: () => toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudo quitar', life: 4000 }),
  });

  const handleRemoveFromGroup = (group: PermissionGroup) => {
    confirmDialog({
      message: `¿Quitar a ${user?.username} del grupo "${group.name}"?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: () => removeFromGroupMutation.mutate(group.id),
    });
  };

  const availableGroups = allGroups.filter((g) => !members.some((m) => m.id === g.id));

  // super_admin and client_admin have full access ('*') — permission groups don't apply
  const isFullAccessRole =
    user?.userType === 'super_admin' || user?.userType === 'client_admin';

  const roleLabel =
    user?.userType === 'super_admin'
      ? 'Super Administrador'
      : user?.userType === 'client_admin'
        ? 'Administrador de Tenant'
        : '';

  return (
    <>
      <Toast ref={toast} />
      <ConfirmDialog />
      <Dialog
        header={user ? `Permisos de ${user.username}` : 'Permisos'}
        visible={!!user}
        onHide={onHide}
        style={{ width: '700px' }}
        maximizable
      >
        {!user ? null : (
          <TabView>
            {/* Groups tab */}
            <TabPanel header={isFullAccessRole ? 'Grupos (N/A)' : `Grupos (${members.length})`}>
              {isFullAccessRole ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 items-start">
                  <i className="pi pi-info-circle text-blue-600 mt-0.5 text-lg" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800 mb-1">
                      Acceso completo — rol: {roleLabel}
                    </p>
                    <p className="text-sm text-blue-700">
                      Este usuario tiene acceso total al sistema. Los grupos de permisos aplican
                      únicamente a <strong>usuarios estándar</strong> (client_user). No es posible
                      ni necesario asignarle grupos de permisos.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-3">
                    <Dropdown
                      value={selectedGroupId}
                      options={availableGroups.map((g) => ({ label: g.name, value: g.id }))}
                      onChange={(e) => setSelectedGroupId(e.value as number)}
                      placeholder="Agregar a un grupo..."
                      className="flex-1"
                      filter
                    />
                    <Button
                      label="Agregar"
                      icon="pi pi-plus"
                      disabled={!selectedGroupId}
                      loading={addToGroupMutation.isPending}
                      onClick={() => selectedGroupId && addToGroupMutation.mutate(selectedGroupId)}
                    />
                  </div>
                  <DataTable value={members} size="small" emptyMessage="No pertenece a ningún grupo">
                    <Column field="name" header="Grupo" />
                    <Column field="description" header="Descripción" body={(r: PermissionGroup) => r.description ?? '-'} />
                    <Column
                      header=""
                      style={{ width: '60px' }}
                      body={(r: PermissionGroup) => (
                        <Button icon="pi pi-times" text size="small" severity="danger" tooltip="Quitar del grupo" tooltipOptions={{ position: 'left' }} onClick={() => handleRemoveFromGroup(r)} />
                      )}
                    />
                  </DataTable>
                </>
              )}
            </TabPanel>

            {/* Effective permissions tab */}
            <TabPanel header={isFullAccessRole ? 'Permisos Efectivos (acceso total)' : `Permisos Efectivos (${effectiveData?.effective.length ?? 0})`}>
              {isFullAccessRole ? (
                <div className="flex flex-col gap-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex gap-2 items-center">
                    <i className="pi pi-check-circle text-green-600" />
                    <span>
                      Acceso completo. Todos los permisos del sistema están disponibles para este usuario.
                    </span>
                  </div>
                  <Tag value="*  (wildcard — acceso total)" severity="success" className="text-sm" />
                </div>
              ) : loadingEffective ? (
                <Skeleton height="200px" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(effectiveData?.effective ?? []).map((perm) => (
                    <Tag key={perm} value={perm} severity="info" className="text-xs" />
                  ))}
                  {(effectiveData?.effective.length ?? 0) === 0 && (
                    <div className="text-gray-400 text-sm">Sin permisos asignados</div>
                  )}
                </div>
              )}
            </TabPanel>
          </TabView>
        )}
      </Dialog>
    </>
  );
}
