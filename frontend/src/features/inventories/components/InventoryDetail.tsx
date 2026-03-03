import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Tag } from 'primereact/tag';
import { Skeleton } from 'primereact/skeleton';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { inventoriesApi, type AddLinePayload } from '../api/inventoriesApi';
import type { InventoryLine } from '../../../shared/types';
import { INVENTORY_STATUS } from '../../../shared/types';

export function InventoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const inventoryId = Number(id);

  const [showAddLine, setShowAddLine] = useState(false);
  const [lineForm, setLineForm] = useState<AddLinePayload>({ warehouseId: 0, productId: 0, realQuantity: 0 });
  const [editingLine, setEditingLine] = useState<{ id: number; realQuantity: number } | null>(null);

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory', inventoryId],
    queryFn: () => inventoriesApi.get(inventoryId),
    enabled: !!inventoryId,
  });

  const addLineMutation = useMutation({
    mutationFn: (payload: AddLinePayload) => inventoriesApi.addLine(inventoryId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', inventoryId] });
      setShowAddLine(false);
      setLineForm({ warehouseId: 0, productId: 0, realQuantity: 0 });
    },
  });

  const updateLineMutation = useMutation({
    mutationFn: ({ lineId, qty }: { lineId: number; qty: number }) =>
      inventoriesApi.updateLine(inventoryId, lineId, qty),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', inventoryId] });
      setEditingLine(null);
    },
  });

  const removeLineMutation = useMutation({
    mutationFn: (lineId: number) => inventoriesApi.removeLine(inventoryId, lineId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', inventoryId] }),
  });

  const validateMutation = useMutation({
    mutationFn: () => inventoriesApi.validate(inventoryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', inventoryId] }),
  });

  const resetMutation = useMutation({
    mutationFn: () => inventoriesApi.resetToDraft(inventoryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', inventoryId] }),
  });

  const removeMutation = useMutation({
    mutationFn: () => inventoriesApi.remove(inventoryId),
    onSuccess: () => navigate('/inventories'),
  });

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
    if (!isDraft) return null;
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
      <ConfirmDialog />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/inventories')}
              className="text-gray-400 hover:text-blue-600 transition-colors"
            >
              <i className="pi pi-arrow-left text-sm" />
            </button>
            <h1 className="text-2xl font-bold text-[#1b3a5f] font-mono">{inventory.ref}</h1>
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

        {/* Actions */}
        <div className="flex gap-2">
          {isDraft && (
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
          {!isDraft && (
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
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-700 text-sm">
            Líneas del inventario ({lines.length})
          </span>
        </div>
        <DataTable
          value={lines}
          size="small"
          emptyMessage={isDraft ? 'Sin líneas — agregar productos arriba' : 'Sin líneas registradas'}
        >
          <Column
            header="Almacén ID"
            field="warehouseId"
            body={(r: InventoryLine) => r.warehouseId ?? '-'}
            style={{ width: '110px' }}
          />
          <Column
            header="Producto ID"
            field="productId"
            body={(r: InventoryLine) => r.productId ?? '-'}
            style={{ width: '110px', fontFamily: 'monospace' }}
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
          <Column header="Acciones" body={actionsBody} style={{ width: '90px' }} />
        </DataTable>
      </div>

      {/* Dialog: agregar línea */}
      <Dialog
        header="Agregar línea"
        visible={showAddLine}
        onHide={() => setShowAddLine(false)}
        style={{ width: '400px' }}
      >
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">ID Almacén *</label>
            <InputText
              value={lineForm.warehouseId ? String(lineForm.warehouseId) : ''}
              onChange={(e) =>
                setLineForm((f) => ({ ...f, warehouseId: Number(e.target.value) || 0 }))
              }
              placeholder="ej: 1"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">ID Producto *</label>
            <InputText
              value={lineForm.productId ? String(lineForm.productId) : ''}
              onChange={(e) =>
                setLineForm((f) => ({ ...f, productId: Number(e.target.value) || 0 }))
              }
              placeholder="ej: 42"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Cantidad real contada *</label>
            <InputNumber
              value={lineForm.realQuantity}
              onValueChange={(e) =>
                setLineForm((f) => ({ ...f, realQuantity: e.value ?? 0 }))
              }
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
              disabled={!lineForm.warehouseId || !lineForm.productId}
              onClick={() => addLineMutation.mutate(lineForm)}
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
