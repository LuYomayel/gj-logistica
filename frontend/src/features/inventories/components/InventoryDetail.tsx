import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { AutoComplete } from 'primereact/autocomplete';
import type { AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { InputNumber } from 'primereact/inputnumber';
import { Tag } from 'primereact/tag';
import { Skeleton } from 'primereact/skeleton';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { inventoriesApi, type AddLinePayload } from '../api/inventoriesApi';
import { warehousesApi } from '../../warehouses/api/warehousesApi';
import { productsApi } from '../../products/api/productsApi';
import { apiErrMsg } from '../../../shared/utils/apiErrMsg';
import { useAuth } from '../../../shared/hooks/useAuth';
import type { InventoryLine, Product } from '../../../shared/types';
import { INVENTORY_STATUS } from '../../../shared/types';

export function InventoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useRef<Toast>(null);
  const inventoryId = Number(id);
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('stock.write_inventories');

  const [showAddLine, setShowAddLine] = useState(false);
  const [lineWarehouseId, setLineWarehouseId] = useState<number | null>(null);
  const [lineProductInput, setLineProductInput] = useState<string | Product>('');
  const [lineProductSuggestions, setLineProductSuggestions] = useState<Product[]>([]);
  const [lineQty, setLineQty] = useState<number>(0);
  const [editingLine, setEditingLine] = useState<{ id: number; realQuantity: number } | null>(null);

  const selectedProduct: Product | null =
    lineProductInput !== '' && typeof lineProductInput !== 'string'
      ? (lineProductInput as Product)
      : null;

  const showSuccess = (detail: string) =>
    toast.current?.show({ severity: 'success', summary: 'Éxito', detail, life: 3000 });
  const showError = (detail: string) =>
    toast.current?.show({ severity: 'error', summary: 'Error', detail, life: 5000 });

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory', inventoryId],
    queryFn: () => inventoriesApi.get(inventoryId),
    enabled: !!inventoryId,
  });

  // Load warehouses for dropdown
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list(),
  });

  const warehousesList = warehousesData?.data ?? [];

  const warehouseOptions = warehousesList.map((w) => ({
    label: w.name,
    value: w.id,
  }));

  // Build a map for displaying warehouse names in the table
  const warehouseMap = new Map<number, string>();
  warehousesList.forEach((w) => warehouseMap.set(w.id, w.name));

  const addLineMutation = useMutation({
    mutationFn: (payload: AddLinePayload) => inventoriesApi.addLine(inventoryId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', inventoryId] });
      setShowAddLine(false);
      setLineWarehouseId(null);
      setLineProductInput('');
      setLineQty(0);
      showSuccess('Línea agregada');
    },
    onError: (err) => showError(apiErrMsg(err, 'Error al agregar la línea')),
  });

  const updateLineMutation = useMutation({
    mutationFn: ({ lineId, qty }: { lineId: number; qty: number }) =>
      inventoriesApi.updateLine(inventoryId, lineId, qty),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', inventoryId] });
      setEditingLine(null);
      showSuccess('Cantidad actualizada');
    },
    onError: (err) => showError(apiErrMsg(err, 'Error al actualizar la línea')),
  });

  const removeLineMutation = useMutation({
    mutationFn: (lineId: number) => inventoriesApi.removeLine(inventoryId, lineId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', inventoryId] });
      showSuccess('Línea eliminada');
    },
    onError: (err) => showError(apiErrMsg(err, 'Error al eliminar la línea')),
  });

  const validateMutation = useMutation({
    mutationFn: () => inventoriesApi.validate(inventoryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', inventoryId] });
      showSuccess('Inventario validado — movimientos de stock generados');
    },
    onError: (err) => showError(apiErrMsg(err, 'Error al validar el inventario')),
  });

  const resetMutation = useMutation({
    mutationFn: () => inventoriesApi.resetToDraft(inventoryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', inventoryId] });
      showSuccess('Inventario devuelto a borrador');
    },
    onError: (err) => showError(apiErrMsg(err, 'Error al devolver a borrador')),
  });

  const removeMutation = useMutation({
    mutationFn: () => inventoriesApi.remove(inventoryId),
    onSuccess: () => {
      showSuccess('Inventario eliminado');
      navigate('/inventories');
    },
    onError: (err) => showError(apiErrMsg(err, 'Error al eliminar el inventario')),
  });

  // Product search for autocomplete
  const searchProducts = async (event: AutoCompleteCompleteEvent) => {
    const query = event.query.trim();
    if (query.length < 1) {
      setLineProductSuggestions([]);
      return;
    }
    try {
      const result = await productsApi.list({ search: query, limit: 30 });
      setLineProductSuggestions(result.data);
    } catch {
      setLineProductSuggestions([]);
    }
  };

  const productItemTemplate = (product: Product) => (
    <div className="flex items-center gap-2 py-1">
      <span className="font-mono text-xs text-gray-500 shrink-0">{product.ref}</span>
      <span className="text-sm truncate">{product.label}</span>
      <span className="ml-auto text-xs shrink-0 font-medium text-gray-400">
        Stock: {product.stock}
      </span>
    </div>
  );

  const handleAddLine = () => {
    if (!lineWarehouseId || !selectedProduct) return;
    addLineMutation.mutate({
      warehouseId: lineWarehouseId,
      productId: selectedProduct.id,
      realQuantity: lineQty,
    });
  };

  if (isLoading || !inventory) return <Skeleton height="400px" />;

  const isDraft = inventory.status === 0;
  const statusInfo = INVENTORY_STATUS[inventory.status] ?? { label: String(inventory.status), severity: 'secondary' as const };
  const lines: InventoryLine[] = (inventory.lines as InventoryLine[]) ?? [];

  const confirmValidate = () => {
    confirmDialog({
      message: '¿Generar movimientos de stock y cerrar este inventario?',
      header: 'Validar inventario',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Validar',
      rejectLabel: 'Cancelar',
      accept: () => validateMutation.mutate(),
    });
  };

  const confirmRemove = () => {
    confirmDialog({
      message: '¿Eliminar este inventario? Esta acción no se puede deshacer.',
      header: 'Eliminar inventario',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => removeMutation.mutate(),
    });
  };

  const deltaBody = (row: InventoryLine) => {
    if (row.realQuantity === null || row.realQuantity === undefined) return '-';
    const exp = row.expectedQuantity ?? 0;
    const delta = (row.realQuantity ?? 0) - exp;
    if (delta === 0) return <span className="text-gray-400">0</span>;
    return (
      <span className={delta > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
        {delta > 0 ? '+' : ''}{delta}
      </span>
    );
  };

  const actionsBody = (row: InventoryLine) => {
    if (!isDraft || !canWrite) return null;
    return (
      <div className="flex gap-1">
        <Button
          icon="pi pi-pencil"
          size="small"
          text
          onClick={() => setEditingLine({ id: row.id, realQuantity: row.realQuantity ?? 0 })}
        />
        <Button
          icon="pi pi-trash"
          size="small"
          text
          severity="danger"
          loading={removeLineMutation.isPending}
          onClick={() => removeLineMutation.mutate(row.id)}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <Toast ref={toast} />
      <ConfirmDialog />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/inventories')}
              className="text-gray-400 hover:text-blue-600 transition-colors"
            >
              <i className="pi pi-arrow-left text-sm" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1b3a5f] font-mono">{inventory.ref}</h1>
            <Tag value={statusInfo.label} severity={statusInfo.severity} />
          </div>
          {inventory.label && (
            <p className="text-gray-500 text-sm mt-1 ml-7">{inventory.label}</p>
          )}
          {inventory.warehouse && (
            <p className="text-gray-400 text-xs mt-0.5 ml-7">
              <i className="pi pi-warehouse mr-1" /> {inventory.warehouse.name}
            </p>
          )}
        </div>

        {/* Actions — only for users with write permission */}
        <div className="flex gap-2">
          {isDraft && canWrite && (
            <>
              <Button
                label="Agregar línea"
                icon="pi pi-plus"
                size="small"
                outlined
                onClick={() => setShowAddLine(true)}
              />
              <Button
                label="Validar"
                icon="pi pi-check"
                size="small"
                loading={validateMutation.isPending}
                onClick={confirmValidate}
                className="bg-green-600 text-white border-green-600"
              />
              <Button
                label="Eliminar"
                icon="pi pi-trash"
                size="small"
                severity="danger"
                outlined
                onClick={confirmRemove}
              />
            </>
          )}
          {!isDraft && canWrite && (
            <Button
              label="Volver a borrador"
              icon="pi pi-undo"
              size="small"
              outlined
              severity="warning"
              loading={resetMutation.isPending}
              onClick={() => resetMutation.mutate()}
            />
          )}
        </div>
      </div>

      {/* Lines table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-700 text-sm">
            Líneas del inventario ({lines.length})
          </span>
        </div>
        <DataTable
          value={lines}
          size="small"
          emptyMessage={isDraft ? 'Sin líneas — agregar productos arriba' : 'Sin líneas registradas'}
          scrollable
        >
          <Column
            header="Almacén"
            field="warehouseId"
            body={(r: InventoryLine) => {
              if (r.warehouse) return r.warehouse.name;
              if (r.warehouseId) return warehouseMap.get(r.warehouseId) ?? `ID: ${r.warehouseId}`;
              return '-';
            }}
            style={{ width: '150px' }}
          />
          <Column
            header="Producto"
            field="productId"
            body={(r: InventoryLine) => {
              if (r.product) return `${r.product.ref} — ${r.product.label ?? ''}`;
              return r.productId ? `ID: ${r.productId}` : '-';
            }}
          />
          <Column
            header="Cant. esperada"
            field="expectedQuantity"
            body={(r: InventoryLine) =>
              r.expectedQuantity !== null && r.expectedQuantity !== undefined
                ? r.expectedQuantity
                : '-'
            }
            style={{ width: '130px', textAlign: 'right' }}
            bodyStyle={{ textAlign: 'right' }}
          />
          <Column
            header="Cant. real"
            field="realQuantity"
            body={(r: InventoryLine) =>
              r.realQuantity !== null && r.realQuantity !== undefined ? r.realQuantity : '-'
            }
            style={{ width: '110px', textAlign: 'right' }}
            bodyStyle={{ textAlign: 'right' }}
          />
          <Column
            header="Diferencia"
            body={deltaBody}
            style={{ width: '100px', textAlign: 'right' }}
            bodyStyle={{ textAlign: 'right' }}
          />
          {canWrite && (
            <Column header="Acciones" body={actionsBody} style={{ width: '90px' }} />
          )}
        </DataTable>
      </div>

      {/* Dialog: agregar línea */}
      <Dialog
        header="Agregar línea"
        visible={showAddLine}
        onHide={() => setShowAddLine(false)}
        style={{ width: '450px' }}
      >
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Almacén *</label>
            <Dropdown
              value={lineWarehouseId}
              options={warehouseOptions}
              onChange={(e) => setLineWarehouseId(e.value)}
              placeholder="Seleccionar almacén..."
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Producto *</label>
            <AutoComplete
              value={lineProductInput}
              field="label"
              suggestions={lineProductSuggestions}
              completeMethod={searchProducts}
              itemTemplate={productItemTemplate}
              selectedItemTemplate={(p: Product) => `${p.ref} — ${p.label ?? ''}`}
              onChange={(e) => setLineProductInput(e.value as string | Product)}
              placeholder="Buscar por ref o nombre..."
              minLength={1}
              delay={200}
              className="w-full"
              inputClassName="w-full"
            />
            {selectedProduct && (
              <p className="text-xs text-gray-500 mt-1">
                <span className="font-medium">{selectedProduct.ref}</span>
                {selectedProduct.label ? ` · ${selectedProduct.label}` : ''}
                {' · '}
                <span className="font-medium text-green-600">
                  Stock: {selectedProduct.stock}
                </span>
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Cantidad real contada *</label>
            <InputNumber
              value={lineQty}
              onValueChange={(e) => setLineQty(e.value ?? 0)}
              min={0}
              mode="decimal"
              minFractionDigits={0}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              label="Cancelar"
              outlined
              severity="secondary"
              onClick={() => setShowAddLine(false)}
            />
            <Button
              label="Agregar"
              icon="pi pi-plus"
              loading={addLineMutation.isPending}
              disabled={!lineWarehouseId || !selectedProduct}
              onClick={handleAddLine}
              className="bg-blue-600 text-white border-blue-600"
            />
          </div>
        </div>
      </Dialog>

      {/* Dialog: editar línea */}
      <Dialog
        header="Editar cantidad real"
        visible={!!editingLine}
        onHide={() => setEditingLine(null)}
        style={{ width: '320px' }}
        breakpoints={{ '575px': '95vw' }}
      >
        {editingLine && (
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Nueva cantidad real</label>
              <InputNumber
                value={editingLine.realQuantity}
                onValueChange={(e) =>
                  setEditingLine((prev) => prev ? { ...prev, realQuantity: e.value ?? 0 } : null)
                }
                min={0}
                mode="decimal"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                label="Cancelar"
                outlined
                severity="secondary"
                onClick={() => setEditingLine(null)}
              />
              <Button
                label="Guardar"
                icon="pi pi-save"
                loading={updateLineMutation.isPending}
                onClick={() =>
                  updateLineMutation.mutate({
                    lineId: editingLine.id,
                    qty: editingLine.realQuantity,
                  })
                }
                className="bg-blue-600 text-white border-blue-600"
              />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
