import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import type { DataTablePageEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { thirdPartiesApi, type ThirdPartyFilters } from '../api/thirdPartiesApi';
import { ThirdPartyFormDialog } from './ThirdPartyFormDialog';
import { useAuth } from '../../../shared/hooks/useAuth';
import type { ThirdParty } from '../../../shared/types';

export function ThirdPartiesTable() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [filters, setFilters] = useState<ThirdPartyFilters>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['third-parties', filters],
    queryFn: () => thirdPartiesApi.list(filters),
  });

  const thirdParties = data?.data ?? [];
  const total = data?.total ?? 0;

  const applyFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      search: searchInput || undefined,
    });
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({ page: 1, limit: 20 });
  };

  const onPage = (e: DataTablePageEvent) => {
    setFilters((prev) => ({
      ...prev,
      page: (e.page ?? 0) + 1,
      limit: e.rows ?? 20,
    }));
  };

  const statusBody = (row: ThirdParty) => (
    <Tag
      value={row.status === 1 ? 'Activo' : 'Inactivo'}
      severity={row.status === 1 ? 'success' : 'danger'}
    />
  );

  if (isLoading) {
    return <Skeleton height="400px" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <ThirdPartyFormDialog
        visible={showCreate}
        onHide={() => setShowCreate(false)}
        onSaved={(id) => navigate(`/third-parties/${id}`)}
      />

      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1b3a5f]">Terceros</h1>
          <p className="text-gray-500 text-sm">{total.toLocaleString('es-AR')} terceros en total</p>
        </div>
        <div className="flex gap-2">
          {hasPermission('third_parties.write') && (
            <Button
              label="Nuevo Tercero"
              icon="pi pi-plus"
              onClick={() => setShowCreate(true)}
              className="bg-[#1b3a5f] text-white border-[#1b3a5f] px-4 py-2"
            />
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 min-w-[220px]">
            <label className="text-xs font-medium text-gray-600">Buscar (nombre, código, CUIT)</label>
            <InputText
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar..."
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              className="text-sm"
            />
          </div>
          <Button
            label="Buscar"
            icon="pi pi-search"
            onClick={applyFilters}
            className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700 px-4 py-2"
          />
          <Button
            label="Limpiar"
            icon="pi pi-times"
            onClick={clearFilters}
            outlined
            severity="secondary"
            className="px-4 py-2"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <DataTable
          value={thirdParties}
          lazy
          paginator
          rows={filters.limit ?? 20}
          totalRecords={total}
          first={((filters.page ?? 1) - 1) * (filters.limit ?? 20)}
          onPage={onPage}
          rowsPerPageOptions={[10, 20, 50]}
          size="small"
          emptyMessage="No se encontraron terceros"
          rowClassName={() => 'cursor-pointer hover:bg-blue-50 transition-colors'}
          onRowClick={(e) => navigate(`/third-parties/${(e.data as ThirdParty).id}`)}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          currentPageReportTemplate="{first}-{last} de {totalRecords}"
        >
          <Column field="name" header="Nombre" />
          <Column field="clientCode" header="Código Cliente" style={{ width: '130px' }} />
          <Column field="taxId" header="CUIT" style={{ width: '150px' }} />
          <Column field="email" header="Email" style={{ width: '200px' }} />
          <Column field="phone" header="Teléfono" style={{ width: '130px' }} />
          <Column field="city" header="Ciudad" style={{ width: '130px' }} />
          <Column
            header="Estado"
            body={statusBody}
            style={{ width: '100px' }}
          />
        </DataTable>
      </div>
    </div>
  );
}
