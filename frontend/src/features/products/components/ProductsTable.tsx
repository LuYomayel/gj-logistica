import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import type { DataTablePageEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Skeleton } from 'primereact/skeleton';
import { Dropdown } from 'primereact/dropdown';
import { productsApi, type ProductFilters } from '../api/productsApi';
import { CreateProductDialog } from './CreateProductDialog';
import { AuthImage } from '../../../shared/components/AuthImage';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useTenants, canManageTenants } from '../../../shared/hooks/useTenants';
import type { Product } from '../../../shared/types';

export function ProductsTable() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, user } = useAuth();
  const showTenantColumn = canManageTenants(user?.userType);
  const { data: tenants = [] } = useTenants();
  const [filters, setFilters] = useState<ProductFilters>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [rubInput, setRubInput] = useState('');
  const [marcaInput, setMarcaInput] = useState('');
  const [tenantInput, setTenantInput] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    try { await productsApi.exportCsv(); } finally { setExporting(false); }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset input
    try {
      const result = await productsApi.importExcel(file);
      const msg = `Importación OK: ${result.created} creados, ${result.updated} actualizados` +
        (result.errors.length ? `. Errores: ${result.errors.slice(0, 3).join(' | ')}` : '');
      setImportMsg(msg);
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      setTimeout(() => setImportMsg(''), 8000);
    } catch {
      setImportMsg('Error al importar el archivo');
      setTimeout(() => setImportMsg(''), 5000);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsApi.list(filters),
  });

  const products = data?.data ?? [];
  const total = data?.total ?? 0;

  const applyFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      search: searchInput || undefined,
      rubro: rubInput || undefined,
      marca: marcaInput || undefined,
      tenantId: tenantInput ?? undefined,
    });
  };

  const clearFilters = () => {
    setSearchInput('');
    setRubInput('');
    setMarcaInput('');
    setTenantInput(null);
    setFilters({ page: 1, limit: 20 });
  };

  const onPage = (e: DataTablePageEvent) => {
    setFilters((prev) => ({
      ...prev,
      page: (e.page ?? 0) + 1,
      limit: e.rows ?? 20,
    }));
  };

  if (isLoading) {
    return <Skeleton height="400px" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <CreateProductDialog
        visible={showCreate}
        onHide={() => setShowCreate(false)}
        onCreated={(id) => navigate(`/products/${id}`)}
      />

      {/* Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1b3a5f]">Productos</h1>
          <p className="text-gray-500 text-sm">{total.toLocaleString('es-AR')} productos en total</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImportFile}
          />
          {hasPermission('products.write') && (
            <Button
              label="Importar Excel"
              icon="pi pi-upload"
              outlined
              severity="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2"
            />
          )}
          {hasPermission('products.export') && (
            <Button
              label="Exportar CSV"
              icon="pi pi-download"
              outlined
              severity="secondary"
              loading={exporting}
              onClick={handleExport}
              className="px-4 py-2"
            />
          )}
          {hasPermission('products.write') && (
            <Button
              label="Nuevo Producto"
              icon="pi pi-plus"
              onClick={() => setShowCreate(true)}
              className="bg-[#1b3a5f] text-white border-[#1b3a5f] px-4 py-2"
            />
          )}
        </div>
      </div>

      {importMsg && (
        <p className={`text-sm rounded px-3 py-2 border ${importMsg.startsWith('Error') ? 'text-red-700 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200'}`}>
          {importMsg}
        </p>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[180px]">
            <label className="text-xs font-medium text-gray-600">Buscar (ref, nombre)</label>
            <InputText
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar..."
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              className="text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[140px]">
            <label className="text-xs font-medium text-gray-600">Rubro</label>
            <InputText
              value={rubInput}
              onChange={(e) => setRubInput(e.target.value)}
              placeholder="Rubro..."
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              className="text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[140px]">
            <label className="text-xs font-medium text-gray-600">Marca</label>
            <InputText
              value={marcaInput}
              onChange={(e) => setMarcaInput(e.target.value)}
              placeholder="Marca..."
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              className="text-sm"
            />
          </div>
          {showTenantColumn && (
            <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[200px]">
              <label className="text-xs font-medium text-gray-600">Organización</label>
              <Dropdown
                value={tenantInput}
                onChange={(e) => setTenantInput(e.value)}
                options={[
                  { label: 'Todas', value: null },
                  ...tenants.map((t) => ({ label: `${t.name} (${t.code})`, value: t.id })),
                ]}
                placeholder="Todas"
                className="text-sm"
              />
            </div>
          )}
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
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <DataTable
          value={products}
          lazy
          paginator
          scrollable
          rows={filters.limit ?? 20}
          totalRecords={total}
          first={((filters.page ?? 1) - 1) * (filters.limit ?? 20)}
          onPage={onPage}
          rowsPerPageOptions={[10, 20, 50]}
          size="small"
          emptyMessage="No se encontraron productos"
          rowClassName={() => 'cursor-pointer hover:bg-blue-50 transition-colors'}
          onRowClick={(e) => navigate(`/products/${(e.data as Product).id}`)}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          currentPageReportTemplate="{first}-{last} de {totalRecords}"
        >
          <Column
            header=""
            style={{ width: '60px' }}
            body={(row: Product) => (
              <div
                className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <AuthImage
                  src={productsApi.imagePath(row.id, true)}
                  alt={row.ref}
                  preview
                  width={40}
                  height={40}
                  fallback={<i className="pi pi-image text-gray-300 text-xl" />}
                />
              </div>
            )}
          />
          <Column field="ref" header="Ref" style={{ width: '120px', fontFamily: 'monospace' }} />
          <Column field="label" header="Etiqueta" />
          {showTenantColumn && (
            <Column
              header="Organización"
              style={{ width: '180px' }}
              body={(row: Product) => row.tenant?.name ?? `#${row.entity}`}
            />
          )}
          <Column field="barcode" header="Código de barras" style={{ width: '160px' }} />
          <Column
            field="stock"
            header="Stock físico"
            style={{ width: '100px', textAlign: 'right' }}
            bodyStyle={{ textAlign: 'right' }}
            body={(row: Product) => (
              <span
                className={
                  row.stock <= row.stockAlertThreshold
                    ? 'font-semibold text-red-600'
                    : 'text-gray-800'
                }
              >
                {row.stock}
              </span>
            )}
          />
          {hasPermission('products.read_position') && (
            <Column field="posicion" header="Posición" style={{ width: '100px' }} />
          )}
          <Column field="color" header="Color" style={{ width: '100px' }} />
        </DataTable>
      </div>
    </div>
  );
}
