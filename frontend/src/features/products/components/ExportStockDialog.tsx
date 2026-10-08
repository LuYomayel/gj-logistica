import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { productsApi } from '../api/productsApi';
import { useTenants } from '../../../shared/hooks/useTenants';

interface Props {
  visible: boolean;
  onHide: () => void;
}

/** Super_admin elige la organización cuyo stock (Ref, Etiqueta, Cantidad) exportar a .xlsx. */
export function ExportStockDialog({ visible, onHide }: Props) {
  const { data: tenants = [] } = useTenants();
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    if (!tenantId) return;
    setExporting(true);
    setError('');
    try {
      await productsApi.exportStockXlsx(tenantId);
      onHide();
    } catch {
      setError('No se pudo exportar el stock');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog header="Exportar stock por organización" visible={visible} onHide={onHide} className="w-full max-w-md">
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium text-gray-600">Organización</label>
        <Dropdown
          value={tenantId}
          onChange={(e) => setTenantId(e.value)}
          options={tenants.filter((t) => t.isActive).map((t) => ({ label: `${t.name} (${t.code})`, value: t.id }))}
          placeholder="Seleccionar organización"
          className="text-sm"
        />
        <p className="text-xs text-gray-500">Se exporta Referencia, Etiqueta y Cantidad en Excel (.xlsx).</p>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button label="Cancelar" outlined severity="secondary" onClick={onHide} className="px-4 py-2" />
          <Button
            label="Descargar"
            icon="pi pi-file-excel"
            disabled={!tenantId}
            loading={exporting}
            onClick={handleExport}
            className="bg-[#1b3a5f] text-white border-[#1b3a5f] px-4 py-2"
          />
        </div>
      </div>
    </Dialog>
  );
}
