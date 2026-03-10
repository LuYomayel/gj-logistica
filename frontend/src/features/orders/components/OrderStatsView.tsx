import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Skeleton } from 'primereact/skeleton';
import { ordersApi, type OrderStatsFilters } from '../api/ordersApi';
import { ORDER_STATUS } from '../../../shared/types';
import type { OrderStatsByMonth } from '../../../shared/types';

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [
  { label: 'Todos los años', value: undefined },
  ...Array.from({ length: 4 }, (_, i) => {
    const y = currentYear - i;
    return { label: String(y), value: y };
  }),
];

const MONTH_NAMES = [
  '', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

const STATUS_FILTER_OPTIONS = [
  { label: 'Todos', value: undefined },
  { label: 'Borrador', value: 0 },
  { label: 'Validado', value: 1 },
  { label: 'En Proceso', value: 2 },
  { label: 'Despachado', value: 3 },
  { label: 'Cancelado', value: -1 },
];

export function OrderStatsView() {
  const [filters, setFilters] = useState<OrderStatsFilters>({});
  const [applied, setApplied] = useState<OrderStatsFilters>({});

  const { data, isLoading } = useQuery({
    queryKey: ['order-stats', applied],
    queryFn: () => ordersApi.getStats(applied),
  });

  const byMonth = data?.byMonth ?? [];
  const byStatus = data?.byStatus ?? [];

  const totalOrders = byStatus.reduce((s, r) => s + r.count, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1b3a5f]">Estadísticas de pedidos</h1>
        <p className="text-gray-500 text-sm">Desglose mensual y por estado</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-medium text-gray-600">Año</label>
            <Dropdown
              value={filters.year}
              options={YEAR_OPTIONS}
              onChange={(e) => setFilters((f) => ({ ...f, year: e.value }))}
              placeholder="Todos"
              className="text-sm w-full sm:min-w-[140px]"
            />
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-medium text-gray-600">Estado</label>
            <Dropdown
              value={filters.status}
              options={STATUS_FILTER_OPTIONS}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.value }))}
              placeholder="Todos"
              className="text-sm w-full sm:min-w-[140px]"
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
          {/* Monthly breakdown */}
          <div className="xl:col-span-2 bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold text-gray-700 text-sm">
                Pedidos por mes ({byMonth.length} períodos)
              </span>
              <span className="text-xs text-gray-400">
                Total: {totalOrders.toLocaleString('es-AR')} pedidos
              </span>
            </div>
            <DataTable
              value={byMonth}
              size="small"
              emptyMessage="Sin datos"
              scrollable
              scrollHeight="480px"
            >
              <Column
                header="Año"
                field="year"
                sortable
                style={{ width: '80px', textAlign: 'center' }}
                bodyStyle={{ textAlign: 'center', fontWeight: 600 }}
              />
              <Column
                header="Mes"
                field="month"
                body={(r: OrderStatsByMonth) => MONTH_NAMES[r.month] ?? r.month}
                style={{ width: '70px', textAlign: 'center' }}
                bodyStyle={{ textAlign: 'center' }}
              />
              <Column
                header="Pedidos"
                field="count"
                sortable
                style={{ width: '90px', textAlign: 'right' }}
                bodyStyle={{ textAlign: 'right', fontWeight: 700, color: '#1b3a5f' }}
              />
              <Column
                header="Artículos"
                field="totalQuantity"
                sortable
                style={{ width: '100px', textAlign: 'right' }}
                bodyStyle={{ textAlign: 'right' }}
                body={(r: OrderStatsByMonth) =>
                  Number(r.totalQuantity).toLocaleString('es-AR')
                }
              />
              <Column
                header="Barra"
                body={(r: OrderStatsByMonth) => {
                  const maxCount = Math.max(...byMonth.map((m) => m.count), 1);
                  const pct = Math.round((r.count / maxCount) * 100);
                  return (
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  );
                }}
              />
            </DataTable>
          </div>

          {/* By status */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-gray-700 text-sm">Por estado</span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {byStatus.map((r) => {
                const s = ORDER_STATUS[r.status] ?? { label: String(r.status), severity: 'secondary' as const };
                const pct = totalOrders > 0 ? Math.round((r.count / totalOrders) * 100) : 0;
                return (
                  <div key={r.status} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <Tag value={s.label} severity={s.severity} />
                      <span className="text-sm font-semibold text-gray-700">
                        {r.count.toLocaleString('es-AR')}
                        <span className="text-xs text-gray-400 ml-1">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {byStatus.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">Sin datos</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
