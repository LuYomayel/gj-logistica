import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Skeleton } from 'primereact/skeleton';
import { productsApi, type ProductStatsFilters } from '../api/productsApi';
import type { ProductPopularItem } from '../../../shared/types';

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [
  { label: 'Todos los años', value: undefined },
  ...Array.from({ length: 4 }, (_, i) => {
    const y = currentYear - i;
    return { label: String(y), value: y };
  }),
];

export function ProductStatsView() {
  const [filters, setFilters] = useState<ProductStatsFilters>({});
  const [applied, setApplied] = useState<ProductStatsFilters>({});

  const { data, isLoading } = useQuery({
    queryKey: ['product-stats', applied],
    queryFn: () => productsApi.getStats(applied),
  });

  const popular = data?.popularProducts ?? [];
  const byRubro = data?.byRubro ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1b3a5f]">Estadísticas de productos</h1>
        <p className="text-gray-500 text-sm">Popularidad por pedidos y desglose por rubro</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Año</label>
            <Dropdown
              value={filters.year}
              options={YEAR_OPTIONS}
              onChange={(e) => setFilters((f) => ({ ...f, year: e.value }))}
              placeholder="Todos"
              className="text-sm min-w-[140px]"
            />
          </div>
          <Button
            label="Aplicar"
            icon="pi pi-chart-bar"
            onClick={() => setApplied(filters)}
            className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700 px-4 py-2"
          />
          <Button
            label="Limpiar"
            icon="pi pi-times"
            outlined
            severity="secondary"
            onClick={() => {
              setFilters({});
              setApplied({});
            }}
            className="px-4 py-2"
          />
        </div>
      </div>

      {isLoading && <Skeleton height="400px" />}

      {!isLoading && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Popular products — 2/3 width */}
          <div className="xl:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-gray-700 text-sm">
                Top productos por popularidad ({popular.length})
              </span>
            </div>
            <DataTable
              value={popular}
              size="small"
              emptyMessage="Sin datos"
              scrollable
              scrollHeight="480px"
            >
              <Column
                header="#"
                body={(_: unknown, opts: { rowIndex: number }) => (
                  <span className="text-gray-400 text-xs">{opts.rowIndex + 1}</span>
                )}
                style={{ width: '40px' }}
              />
              <Column
                field="ref"
                header="Ref"
                style={{ width: '120px', fontFamily: 'monospace' }}
              />
              <Column
                field="label"
                header="Producto"
                body={(r: ProductPopularItem) => r.label ?? r.ref}
              />
              <Column
                field="rubro"
                header="Rubro"
                body={(r: ProductPopularItem) => r.rubro ?? '-'}
                style={{ width: '130px' }}
              />
              <Column
                field="orderCount"
                header="Pedidos"
                sortable
                style={{ width: '90px', textAlign: 'right' }}
                bodyStyle={{ textAlign: 'right', fontWeight: 600 }}
              />
              <Column
                field="totalQuantity"
                header="Cant. total"
                sortable
                style={{ width: '110px', textAlign: 'right' }}
                bodyStyle={{ textAlign: 'right' }}
                body={(r: ProductPopularItem) =>
                  Number(r.totalQuantity).toLocaleString('es-AR')
                }
              />
            </DataTable>
          </div>

          {/* By rubro — 1/3 width */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-gray-700 text-sm">
                Por rubro ({byRubro.length})
              </span>
            </div>
            <DataTable
              value={byRubro}
              size="small"
              emptyMessage="Sin datos"
              scrollable
              scrollHeight="480px"
            >
              <Column
                field="rubro"
                header="Rubro"
                body={(r: { rubro: string | null }) => r.rubro ?? '(sin rubro)'}
              />
              <Column
                field="productCount"
                header="Productos"
                style={{ width: '90px', textAlign: 'right' }}
                bodyStyle={{ textAlign: 'right' }}
              />
              <Column
                field="orderCount"
                header="Pedidos"
                sortable
                style={{ width: '80px', textAlign: 'right' }}
                bodyStyle={{ textAlign: 'right', fontWeight: 600 }}
              />
            </DataTable>
          </div>
        </div>
      )}
    </div>
  );
}
