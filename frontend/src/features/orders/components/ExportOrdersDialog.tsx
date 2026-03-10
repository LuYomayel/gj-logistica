import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { ordersApi, type OrderFilters } from '../api/ordersApi';
import { thirdPartiesApi } from '../../third-parties/api/thirdPartiesApi';

interface Props {
  visible: boolean;
  onHide: () => void;
}

const STATUS_OPTIONS = [
  { label: 'Todos los estados', value: '' },
  { label: 'Borrador', value: 0 },
  { label: 'Validado', value: 1 },
  { label: 'En Proceso', value: 2 },
  { label: 'Despachado', value: 3 },
  { label: 'Cancelado', value: -1 },
];

export function ExportOrdersDialog({ visible, onHide }: Props) {
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [clientRef, setClientRef] = useState('');
  const [status, setStatus] = useState<number | string>('');
  const [thirdPartyId, setThirdPartyId] = useState<number | ''>('');
  const [exporting, setExporting] = useState(false);

  const { data: tpData } = useQuery({
    queryKey: ['third-parties-all'],
    queryFn: () => thirdPartiesApi.list({ limit: 200 }),
    enabled: visible,
  });

  const thirdPartyOptions = [
    { label: 'Todos los terceros', value: '' },
    ...(tpData?.data ?? []).map((tp) => ({ label: tp.name, value: tp.id })),
  ];

  const handleExport = async () => {
    setExporting(true);
    try {
      const filters: OrderFilters = {};
      if (dateFrom) filters.dateFrom = dateFrom.toISOString().split('T')[0];
      if (dateTo) filters.dateTo = dateTo.toISOString().split('T')[0];
      if (clientRef.trim()) filters.clientRef = clientRef.trim();
      if (status !== '') filters.status = status as number;
      if (thirdPartyId !== '') filters.thirdPartyId = thirdPartyId as number;

      await ordersApi.exportCsv(filters);
      onHide();
    } finally {
      setExporting(false);
    }
  };

  const handleHide = () => {
    setDateFrom(null);
    setDateTo(null);
    setClientRef('');
    setStatus('');
    setThirdPartyId('');
    onHide();
  };

  return (
    <Dialog
      header="Exportar Pedidos a CSV"
      visible={visible}
      onHide={handleHide}
      style={{ width: '460px' }}
      breakpoints={{ '640px': '95vw', '575px': '100vw' }}
      modal
      draggable={false}
    >
      <div className="flex flex-col gap-4 pt-2">

        {/* Rango de fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Fecha desde</label>
            <Calendar
              value={dateFrom}
              onChange={(e) => setDateFrom(e.value as Date | null)}
              dateFormat="dd/mm/yy"
              placeholder="dd/mm/aaaa"
              showIcon
              className="w-full text-sm"
              maxDate={dateTo ?? undefined}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Fecha hasta</label>
            <Calendar
              value={dateTo}
              onChange={(e) => setDateTo(e.value as Date | null)}
              dateFormat="dd/mm/yy"
              placeholder="dd/mm/aaaa"
              showIcon
              className="w-full text-sm"
              minDate={dateFrom ?? undefined}
            />
          </div>
        </div>

        {/* Cliente */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Ref. cliente</label>
          <InputText
            value={clientRef}
            onChange={(e) => setClientRef(e.target.value)}
            placeholder="Buscar por ref. cliente..."
            className="w-full text-sm"
          />
        </div>

        {/* Estado */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Estado</label>
          <Dropdown
            value={status}
            options={STATUS_OPTIONS}
            onChange={(e) => setStatus(e.value)}
            placeholder="Todos los estados"
            className="w-full text-sm"
          />
        </div>

        {/* Tercero */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Tercero</label>
          <Dropdown
            value={thirdPartyId}
            options={thirdPartyOptions}
            onChange={(e) => setThirdPartyId(e.value)}
            placeholder="Todos los terceros"
            className="w-full text-sm"
            filter
            filterPlaceholder="Buscar tercero..."
          />
        </div>

        {/* Nota */}
        {(dateFrom || dateTo || clientRef || status !== '' || thirdPartyId !== '') && (
          <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-3 py-2">
            Se exportarán solo los pedidos que coincidan con los filtros seleccionados.
          </p>
        )}
        {(!dateFrom && !dateTo && !clientRef && status === '' && thirdPartyId === '') && (
          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-3 py-2">
            Sin filtros: se exportarán todos los pedidos.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            label="Cancelar"
            severity="secondary"
            outlined
            onClick={handleHide}
          />
          <Button
            label="Exportar CSV"
            icon="pi pi-download"
            loading={exporting}
            onClick={handleExport}
            className="bg-[#1b3a5f] text-white border-[#1b3a5f]"
          />
        </div>
      </div>
    </Dialog>
  );
}
