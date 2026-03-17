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
import { tenantsApi } from '../api/tenantsApi';
import { apiErrMsg } from '../../../shared/utils/apiErrMsg';
import { TenantFormDialog } from './TenantFormDialog';
import type { Tenant } from '../../../shared/types';

export function TenantsTable() {
  const toast = useRef<Toast>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: tenantsApi.list,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => tenantsApi.deactivate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tenants'] });
      toast.current?.show({ severity: 'success', summary: 'Desactivado', detail: 'Organización desactivada', life: 3000 });
    },
    onError: (err) => {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: apiErrMsg(err, 'No se pudo desactivar la organización'), life: 4000 });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => tenantsApi.activate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tenants'] });
      toast.current?.show({ severity: 'success', summary: 'Activado', detail: 'Organización reactivada', life: 3000 });
    },
    onError: (err) => {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: apiErrMsg(err, 'No se pudo activar la organización'), life: 4000 });
    },
  });

  const handleCreate = () => { setEditingTenant(null); setDialogVisible(true); };
  const handleEdit = (t: Tenant) => { setEditingTenant(t); setDialogVisible(true); };
  const handleDeactivate = (t: Tenant) => {
    confirmDialog({
      message: `¿Desactivar la organización "${t.name}"? Sus usuarios no podrán operar.`,
      header: 'Confirmar desactivación',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      acceptLabel: 'Desactivar',
      rejectLabel: 'Cancelar',
      accept: () => deactivateMutation.mutate(t.id),
    });
  };
  const handleActivate = (t: Tenant) => {
    confirmDialog({
      message: `¿Reactivar la organización "${t.name}"?`,
      header: 'Confirmar reactivación',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Reactivar',
      rejectLabel: 'Cancelar',
      accept: () => activateMutation.mutate(t.id),
    });
  };

  if (isLoading) return <Skeleton height="400px" />;

  const tenants = data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1b3a5f]">Organizaciones</h1>
          <p className="text-gray-500 text-sm">{tenants.length} organizaciones registradas</p>
        </div>
        <Button label="Nueva Organización" icon="pi pi-plus" onClick={handleCreate} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <DataTable
          value={tenants}
          size="small"
          scrollable
          emptyMessage="No hay organizaciones"
          onRowClick={(e) => navigate(`/admin/organizaciones/${(e.data as Tenant).id}`)}
          rowClassName={() => 'cursor-pointer hover:bg-gray-50'}
        >
          <Column field="id" header="ID" style={{ width: '60px' }} />
          <Column field="name" header="Nombre" />
          <Column field="code" header="Código" style={{ width: '120px' }} body={(r: Tenant) => <code className="bg-gray-100 px-1 rounded text-xs">{r.code}</code>} />
          <Column
            field="isActive"
            header="Estado"
            style={{ width: '100px', textAlign: 'center' }}
            bodyStyle={{ textAlign: 'center' }}
            body={(r: Tenant) => <Tag value={r.isActive ? 'Activo' : 'Inactivo'} severity={r.isActive ? 'success' : 'danger'} />}
          />
          <Column field="createdAt" header="Creado" style={{ width: '160px' }} body={(r: Tenant) => new Date(r.createdAt).toLocaleDateString('es-AR')} />
          <Column
            header=""
            style={{ width: '100px', textAlign: 'right' }}
            bodyStyle={{ textAlign: 'right' }}
            body={(r: Tenant) => (
              <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                <Button icon="pi pi-pencil" text size="small" tooltip="Editar" tooltipOptions={{ position: 'left' }} onClick={() => handleEdit(r)} />
                {r.isActive ? (
                  <Button
                    icon="pi pi-ban"
                    text size="small" severity="danger"
                    tooltip="Desactivar"
                    tooltipOptions={{ position: 'left' }}
                    loading={deactivateMutation.isPending && deactivateMutation.variables === r.id}
                    onClick={() => handleDeactivate(r)}
                  />
                ) : (
                  <Button
                    icon="pi pi-check-circle"
                    text size="small" severity="success"
                    tooltip="Reactivar"
                    tooltipOptions={{ position: 'left' }}
                    loading={activateMutation.isPending && activateMutation.variables === r.id}
                    onClick={() => handleActivate(r)}
                  />
                )}
              </div>
            )}
          />
        </DataTable>
      </div>

      <TenantFormDialog visible={dialogVisible} onHide={() => setDialogVisible(false)} tenant={editingTenant} />
    </div>
  );
}
