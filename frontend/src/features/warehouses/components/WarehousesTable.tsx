import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Skeleton } from 'primereact/skeleton';
import { useState } from 'react';
import { warehousesApi } from '../api/warehousesApi';
import { CreateWarehouseDialog } from './CreateWarehouseDialog';
import type { Warehouse } from '../../../shared/types';

export function WarehousesTable() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehousesApi.list,
  });

  const warehouses = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton height="48px" />
        <Skeleton height="200px" />
      </div>
    );
  }

  return (
    <>
      <CreateWarehouseDialog visible={showCreate} onHide={() => setShowCreate(false)} />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1b3a5f]">Almacenes</h1>
            <p className="text-sm text-gray-500 mt-0.5">{warehouses.length} almacén{warehouses.length !== 1 ? 'es' : ''}</p>
          </div>
          <Button
            label="Nuevo Almacén"
            icon="pi pi-plus"
            onClick={() => setShowCreate(true)}
            className="bg-[#1b3a5f] text-white border-[#1b3a5f] hover:bg-[#152d4a] px-4 py-2"
          />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <DataTable
            value={warehouses}
            size="small"
            emptyMessage="No hay almacenes registrados"
            onRowClick={(e) => navigate(`/warehouses/${(e.data as Warehouse).id}`)}
            rowClassName={() => 'cursor-pointer hover:bg-blue-50 transition-colors'}
          >
            <Column
              field="name"
              header="Nombre"
              body={(row: Warehouse) => (
                <span className="font-medium text-[#1b3a5f]">{row.name}</span>
              )}
            />
            <Column
              field="shortName"
              header="Nombre corto"
              body={(row: Warehouse) => row.shortName ?? '-'}
            />
            <Column
              field="location"
              header="Ubicación"
              body={(row: Warehouse) => row.location ?? '-'}
            />
            <Column
              field="status"
              header="Estado"
              style={{ width: '120px' }}
              body={(row: Warehouse) => (
                <Tag
                  value={row.status === 1 ? 'Abierto' : 'Cerrado'}
                  severity={row.status === 1 ? 'success' : 'danger'}
                />
              )}
            />
            <Column
              header=""
              style={{ width: '60px' }}
              body={(row: Warehouse) => (
                <Button
                  icon="pi pi-chevron-right"
                  text
                  size="small"
                  onClick={(e) => { e.stopPropagation(); navigate(`/warehouses/${row.id}`); }}
                  className="text-gray-400 hover:text-[#1b3a5f]"
                />
              )}
            />
          </DataTable>
        </div>
      </div>
    </>
  );
}
