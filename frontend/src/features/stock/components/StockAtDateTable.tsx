import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Skeleton } from 'primereact/skeleton';
import { stockApi } from '../api/stockApi';
import type { StockAtDateItem } from '../../../shared/types';

export function StockAtDateTable() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [queryDate, setQueryDate] = useState<string | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ['stock-at-date', queryDate],
    queryFn: () =>
      stockApi.getAtDate({
        date: queryDate!,
      }),
    enabled: !!queryDate,
  });

  const handleSearch = () => {
    const iso = selectedDate.toISOString().split('T')[0];
    setQueryDate(iso);
  };

  const deltaBody = (row: StockAtDateItem) => {
    const delta = row.stockAtDate - row.currentStock;
    if (delta === 0) return <span className="text-gray-400">0</span>;
    return (
      <span className={delta > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
        {delta > 0 ? '+' : ''}{delta}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1b3a5f]">Stock histórico a fecha</h1>
        <p className="text-gray-500 text-sm">
          Consulta el stock que existía en una fecha determinada
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-medium text-gray-600">Fecha de consulta</label>
            <Calendar
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.value as Date)}
              dateFormat="dd/mm/yy"
              showIcon
              maxDate={new Date()}
              className="text-sm"
            />
          </div>
          <Button
            label="Consultar"
            icon="pi pi-search"
            onClick={handleSearch}
            className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700 px-4 py-2"
          />
        </div>
      </div>

      {/* Results */}
      {!queryDate && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
          <i className="pi pi-calendar text-3xl text-gray-300 mb-3" />
          <p className="text-gray-400">Seleccioná una fecha y presioná Consultar</p>
        </div>
      )}

      {queryDate && isLoading && <Skeleton height="400px" />}

      {queryDate && !isLoading && (
        <>
          <div className="text-sm text-gray-500">
            Stock al{' '}
            <strong>{new Date(queryDate + 'T00:00:00').toLocaleDateString('es-AR')}</strong>
            {' '}— {rows?.length ?? 0} productos
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <DataTable
              value={rows ?? []}
              size="small"
              scrollable
              paginator
              rows={50}
              rowsPerPageOptions={[25, 50, 100]}
              emptyMessage="Sin resultados"
              sortField="ref"
              sortOrder={1}
            >
              <Column
                field="ref"
                header="Ref"
                sortable
                style={{ width: '130px', fontFamily: 'monospace' }}
              />
              <Column
                field="label"
                header="Etiqueta"
                body={(r: StockAtDateItem) => r.label ?? '-'}
                sortable
              />
              <Column
                field="stockAtDate"
                header="Stock en la fecha"
                sortable
                style={{ width: '140px', textAlign: 'right' }}
                bodyStyle={{ textAlign: 'right', fontWeight: 600 }}
              />
              <Column
                field="currentStock"
                header="Stock actual"
                sortable
                style={{ width: '120px', textAlign: 'right' }}
                bodyStyle={{ textAlign: 'right' }}
              />
              <Column
                header="Diferencia"
                body={deltaBody}
                style={{ width: '110px', textAlign: 'right' }}
                bodyStyle={{ textAlign: 'right' }}
              />
            </DataTable>
          </div>
        </>
      )}
    </div>
  );
}
