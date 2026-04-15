import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Skeleton } from 'primereact/skeleton';
import { inventoriesApi, type CreateInventoryPayload } from '../api/inventoriesApi';
import { warehousesApi } from '../../warehouses/api/warehousesApi';
import { TenantSelect } from '../../../shared/components/TenantSelect';
import { canManageTenants } from '../../../shared/hooks/useTenants';
import { useAuth } from '../../../shared/hooks/useAuth';
import type { Inventory } from '../../../shared/types';
import { INVENTORY_STATUS } from '../../../shared/types';

export function InventoriesTable() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasPermission, user } = useAuth();
  const isSuperAdmin = canManageTenants(user?.userType);
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<CreateInventoryPayload>({ ref: '' });
  const [tenantFilter, setTenantFilter] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['inventories', page, tenantFilter],
    queryFn: () =>
      inventoriesApi.list({
        page,
        limit: 20,
        tenantId: isSuperAdmin && tenantFilter ? tenantFilter : undefined,
      }),
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', 'all', form.tenantId ?? null],
    queryFn: () =>
      warehousesApi.list(isSuperAdmin && form.tenantId ? { tenantId: form.tenantId } : undefined),
    enabled: showNew && (!isSuperAdmin || !!form.tenantId),
  });
  const warehouseOptions = [
    { label: 'Todos los almacenes', value: null as number | null },
    ...(warehousesData?.data ?? []).map((w) => ({ label: w.name, value: w.id })),
  ];

  const createMutation = useMutation({
    mutationFn: inventoriesApi.create,
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ['inventories'] });
      setShowNew(false);
      setForm({ ref: '' });
      navigate(`/inventories/${inv.id}`);
    },
  });

  const inventories = data?.data ?? [];
  const total = data?.total ?? 0;

  const statusBody = (row: Inventory) => {
    const s = INVENTORY_STATUS[row.status] ?? { label: String(row.status), severity: 'secondary' as const };
    return <Tag value={s.label} severity={s.severity} />;
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('es-AR') : '-';

  if (isLoading) return <Skeleton height="400px" />;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1b3a5f]">Inventarios</h1>
          <p className="text-gray-500 text-sm">{total.toLocaleString('es-AR')} inventarios en total</p>
        </div>
        <div className="flex gap-2 items-center">
          {isSuperAdmin && (
            <TenantSelect
              value={tenantFilter}
              onChange={(id) => { setTenantFilter(id); setPage(1); }}
              placeholder="Filtrar por organización"
              allowNull
              nullLabel="Todas las organizaciones"
              className="w-64"
            />
          )}
          {hasPermission('stock.write_inventories') && (
            <Button
              label="Nuevo inventario"
              icon="pi pi-plus"
              onClick={() => setShowNew(true)}
              className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700 px-4 py-2"
            />
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <DataTable
          value={inventories}
          lazy
          paginator
          scrollable
          rows={20}
          totalRecords={total}
          first={(page - 1) * 20}
          onPage={(e) => setPage((e.page ?? 0) + 1)}
          size="small"
          emptyMessage="No hay inventarios"
          rowClassName={() => 'cursor-pointer hover:bg-blue-50 transition-colors'}
          onRowClick={(e) => navigate(`/inventories/${(e.data as Inventory).id}`)}
        >
          <Column field="ref" header="Referencia" style={{ fontFamily: 'monospace', width: '160px' }} />
          <Column field="label" header="Etiqueta" body={(r: Inventory) => r.label ?? '-'} />
          <Column
            header="Almacén"
            body={(r: Inventory) => r.warehouse?.name ?? (r.warehouseId ? `ID ${r.warehouseId}` : 'Todos')}
          />
          <Column
            header="Fecha inventario"
            body={(r: Inventory) => formatDate(r.inventoryDate)}
            style={{ width: '140px' }}
          />
          <Column
            header="Estado"
            body={statusBody}
            style={{ width: '120px' }}
          />
          <Column
            header="Creado"
            body={(r: Inventory) => formatDate(r.createdAt)}
            style={{ width: '110px' }}
          />
        </DataTable>
      </div>

      {/* Dialog nuevo inventario */}
      <Dialog
        header="Nuevo inventario"
        visible={showNew}
        onHide={() => setShowNew(false)}
        style={{ width: '440px' }}
      >
        <div className="flex flex-col gap-4 pt-2">
          {isSuperAdmin && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Organización *</label>
              <TenantSelect
                value={form.tenantId ?? null}
                onChange={(tenantId) =>
                  setForm((f) => ({
                    ...f,
                    tenantId: tenantId ?? undefined,
                    warehouseId: undefined,
                  }))
                }
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Referencia *</label>
            <InputText
              value={form.ref}
              onChange={(e) => setForm((f) => ({ ...f, ref: e.target.value }))}
              placeholder="INV2026-001"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Etiqueta</label>
            <InputText
              value={form.label ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value || undefined }))}
              placeholder="Descripción opcional"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Almacén</label>
            <Dropdown
              value={form.warehouseId ?? null}
              options={warehouseOptions}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  warehouseId: e.value ?? undefined,
                }))
              }
              placeholder="Seleccionar almacén"
              filter
              showClear
            />
            <small className="text-xs text-gray-500">
              Dejar vacío = inventario sobre todos los almacenes
            </small>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              label="Cancelar"
              outlined
              severity="secondary"
              onClick={() => setShowNew(false)}
            />
            <Button
              label="Crear"
              icon="pi pi-check"
              loading={createMutation.isPending}
              disabled={!form.ref.trim() || (isSuperAdmin && !form.tenantId)}
              onClick={() => createMutation.mutate(form)}
              className="bg-blue-600 text-white border-blue-600"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
