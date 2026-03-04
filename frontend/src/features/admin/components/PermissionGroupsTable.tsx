import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Skeleton } from 'primereact/skeleton';
import { useNavigate } from 'react-router-dom';
import { permissionsApi } from '../api/permissionsApi';
import { PermissionGroupDialog } from './PermissionGroupDialog';
import type { PermissionGroup } from '../../../shared/types';

export function PermissionGroupsTable() {
  const toast = useRef<Toast>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['permission-groups'],
    queryFn: permissionsApi.listGroups,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => permissionsApi.deleteGroup(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['permission-groups'] });
      toast.current?.show({ severity: 'success', summary: 'Eliminado', detail: 'Grupo eliminado', life: 3000 });
    },
    onError: () => {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar', life: 4000 });
    },
  });

  const handleCreate = () => { setEditingGroup(null); setDialogVisible(true); };
  const handleEdit = (g: PermissionGroup) => { setEditingGroup(g); setDialogVisible(true); };
  const handleDelete = (g: PermissionGroup) => {
    confirmDialog({
      message: `¿Eliminar el grupo "${g.name}"? Esto quitará los permisos a todos sus miembros.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: () => deleteMutation.mutate(g.id),
    });
  };

  if (isLoading) return <Skeleton height="400px" />;

  return (
    <div className="flex flex-col gap-4">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1b3a5f]">Grupos de Permisos</h1>
          <p className="text-gray-500 text-sm">{groups.length} grupos registrados</p>
        </div>
        <Button label="Nuevo Grupo" icon="pi pi-plus" onClick={handleCreate} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <DataTable
          value={groups}
          size="small"
          emptyMessage="No hay grupos"
          onRowClick={(e) => navigate(`/admin/permission-groups/${(e.data as PermissionGroup).id}`)}
          rowClassName={() => 'cursor-pointer hover:bg-gray-50'}
        >
          <Column field="id" header="ID" style={{ width: '60px' }} />
          <Column field="name" header="Nombre" />
          <Column field="description" header="Descripción" body={(r: PermissionGroup) => r.description ?? '-'} />
          <Column field="tenantId" header="Tenant ID" style={{ width: '100px' }} body={(r: PermissionGroup) => r.tenantId ?? <span className="text-gray-400 text-xs">Global</span>} />
          <Column
            field="isActive"
            header="Estado"
            style={{ width: '100px', textAlign: 'center' }}
            bodyStyle={{ textAlign: 'center' }}
            body={(r: PermissionGroup) => <Tag value={r.isActive ? 'Activo' : 'Inactivo'} severity={r.isActive ? 'success' : 'danger'} />}
          />
          <Column
            header=""
            style={{ width: '100px', textAlign: 'right' }}
            bodyStyle={{ textAlign: 'right' }}
            body={(r: PermissionGroup) => (
              <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                <Button icon="pi pi-pencil" text size="small" tooltip="Editar" tooltipOptions={{ position: 'left' }} onClick={() => handleEdit(r)} />
                <Button icon="pi pi-trash" text size="small" severity="danger" tooltip="Eliminar" tooltipOptions={{ position: 'left' }} onClick={() => handleDelete(r)} />
              </div>
            )}
          />
        </DataTable>
      </div>

      <PermissionGroupDialog visible={dialogVisible} onHide={() => setDialogVisible(false)} group={editingGroup} />
    </div>
  );
}
