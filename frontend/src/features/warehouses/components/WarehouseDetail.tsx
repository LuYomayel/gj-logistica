import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { TabView, TabPanel } from 'primereact/tabview';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Skeleton } from 'primereact/skeleton';
import { InputText } from 'primereact/inputtext';
import { useState } from 'react';
import { warehousesApi } from '../api/warehousesApi';
import { stockApi } from '../../stock/api/stockApi';
import { StockCorrectionDialog } from './StockCorrectionDialog';
import { useAuth } from '../../../shared/hooks/useAuth';
import type { ProductStock, StockMovement } from '../../../shared/types';

interface InfoRowProps { label: string; value: string | number | null | undefined }
function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex border-b border-gray-100 py-2">
      <span className="w-[180px] shrink-0 text-sm font-medium text-gray-500">{label}</span>
      <span className="text-sm text-gray-800">{value ?? '-'}</span>
    </div>
  );
}

interface Props { id: number }

export function WarehouseDetail({ id }: Props) {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [stockSearch, setStockSearch] = useState('');
  const [movPage, setMovPage] = useState(1);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionProduct, setCorrectionProduct] = useState<
    { id: number; ref: string; label: string | null } | undefined
  >(undefined);

  const { data: warehouse, isLoading: whLoading } = useQuery({
    queryKey: ['warehouses', id],
    queryFn: () => warehousesApi.get(id),
  });

  const { data: stock, isLoading: stockLoading } = useQuery({
    queryKey: ['warehouse-stock', id],
    queryFn: () => warehousesApi.getStock(id),
  });

  const { data: movements, isLoading: movLoading } = useQuery({
    queryKey: ['warehouse-movements', id, movPage],
    queryFn: () => stockApi.getMovements({ warehouseId: id, page: movPage, limit: 25 }),
  });

  const filteredStock = (stock ?? []).filter((s) => {
    if (!stockSearch.trim()) return true;
    const q = stockSearch.toLowerCase();
    return (
      s.product?.ref.toLowerCase().includes(q) ||
      s.product?.label?.toLowerCase().includes(q)
    );
  });

  if (whLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton height="60px" />
        <Skeleton height="300px" />
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="text-center py-20 text-gray-500">
        <i className="pi pi-inbox text-5xl mb-4 block" />
        Almacén no encontrado
      </div>
    );
  }

  const totalStock = (stock ?? []).reduce((sum, s) => sum + s.quantity, 0);
  const uniqueProducts = (stock ?? []).filter((s) => s.quantity > 0).length;

  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString('es-AR') : '-';

  const formatQty = (qty: number) => (
    <span className={qty > 0 ? 'text-green-700 font-medium' : qty < 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
      {qty > 0 ? `+${qty}` : qty}
    </span>
  );

  return (
    <>
      <StockCorrectionDialog
        key={correctionProduct ? `product-${correctionProduct.id}` : 'no-product'}
        visible={showCorrection}
        onHide={() => { setShowCorrection(false); setCorrectionProduct(undefined); }}
        warehouseId={id}
        preselectedProduct={correctionProduct}
      />

      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              icon="pi pi-arrow-left"
              text
              onClick={() => navigate('/warehouses')}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2"
            />
            <div>
              <h1 className="text-xl font-bold text-[#1b3a5f]">{warehouse.name}</h1>
              {warehouse.shortName && (
                <p className="text-sm text-gray-500">{warehouse.shortName}</p>
              )}
            </div>
            <Tag
              value={warehouse.status === 1 ? 'Abierto' : 'Cerrado'}
              severity={warehouse.status === 1 ? 'success' : 'danger'}
            />
          </div>
          {hasPermission('stock.write_movements') && (
            <Button
              label="Corrección Stock"
              icon="pi pi-sliders-h"
              outlined
              severity="secondary"
              onClick={() => { setCorrectionProduct(undefined); setShowCorrection(true); }}
              className="px-4 py-2"
            />
          )}
        </div>

        {/* Info + stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Información del almacén
              </h3>
              <InfoRow label="Nombre" value={warehouse.name} />
              <InfoRow label="Nombre corto" value={warehouse.shortName} />
              <InfoRow label="Descripción" value={warehouse.description} />
              <InfoRow label="Dirección" value={warehouse.address} />
              <InfoRow label="Ubicación" value={warehouse.location} />
              <InfoRow label="Teléfono" value={warehouse.phone} />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Estadísticas de stock
              </h3>
              <InfoRow label="Productos únicos" value={stockLoading ? '…' : uniqueProducts} />
              <InfoRow label="Total unidades" value={stockLoading ? '…' : totalStock.toLocaleString('es-AR')} />
              <InfoRow label="Estado" value={warehouse.status === 1 ? 'Abierto' : 'Cerrado'} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <TabView>
            {/* ── Tab 1: Stock por producto ── */}
            <TabPanel header={`Stock (${filteredStock.length})`} leftIcon="pi pi-box mr-2">
              <div className="flex items-center gap-3 mb-3">
                <span className="p-input-icon-left flex-1 max-w-[320px]">
                  <i className="pi pi-search" />
                  <InputText
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    placeholder="Buscar por ref o nombre..."
                    className="w-full text-sm pl-8"
                  />
                </span>
              </div>

              {stockLoading ? (
                <Skeleton height="200px" />
              ) : (
                <DataTable
                  value={filteredStock}
                  size="small"
                  emptyMessage="Sin productos en este almacén"
                  scrollable
                  scrollHeight="420px"
                >
                  <Column
                    field="product.ref"
                    header="Ref"
                    style={{ width: '120px', fontFamily: 'monospace' }}
                    body={(row: ProductStock) => (
                      <span className="font-mono text-xs text-gray-600">{row.product?.ref ?? '-'}</span>
                    )}
                  />
                  <Column
                    header="Producto"
                    body={(row: ProductStock) => row.product?.label ?? '-'}
                  />
                  <Column
                    field="quantity"
                    header="Stock"
                    style={{ width: '100px', textAlign: 'right' }}
                    bodyStyle={{ textAlign: 'right' }}
                    body={(row: ProductStock) => (
                      <span className={`font-semibold ${row.quantity > 0 ? 'text-green-700' : row.quantity < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {row.quantity.toLocaleString('es-AR')}
                      </span>
                    )}
                  />
                  <Column
                    header=""
                    style={{ width: '140px' }}
                    body={(row: ProductStock) => !hasPermission('stock.write_movements') ? null : (
                      <Button
                        label="Corrección"
                        icon="pi pi-sliders-h"
                        text
                        size="small"
                        onClick={() => {
                          setCorrectionProduct({
                            id: row.productId,
                            ref: row.product?.ref ?? '',
                            label: row.product?.label ?? null,
                          });
                          setShowCorrection(true);
                        }}
                        className="text-blue-600 text-xs"
                      />
                    )}
                  />
                </DataTable>
              )}
            </TabPanel>

            {/* ── Tab 2: Movimientos ── */}
            <TabPanel header="Movimientos" leftIcon="pi pi-history mr-2">
              {movLoading ? (
                <Skeleton height="300px" />
              ) : (
                <>
                  <DataTable
                    value={movements?.data ?? []}
                    size="small"
                    emptyMessage="Sin movimientos registrados"
                    rowClassName={(row: StockMovement) =>
                      !row.originType ? 'cursor-pointer hover:bg-blue-50 transition-colors' : ''
                    }
                    onRowClick={(e) => {
                      const mov = e.data as StockMovement;
                      if (!mov.originType && mov.product) {
                        setCorrectionProduct({ id: mov.productId, ref: mov.product.ref, label: mov.product.label ?? null });
                        setShowCorrection(true);
                      }
                    }}
                  >
                    <Column
                      field="id"
                      header="Ref."
                      style={{ width: '70px' }}
                      body={(row: StockMovement) => (
                        <span className="font-mono text-xs text-gray-500">#{row.id}</span>
                      )}
                    />
                    <Column
                      field="movedAt"
                      header="Fecha"
                      style={{ width: '130px' }}
                      body={(row: StockMovement) => (
                        <span className="text-xs text-gray-600">
                          {formatDate(row.movedAt)}
                        </span>
                      )}
                    />
                    <Column
                      header="Producto"
                      body={(row: StockMovement) => (
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-gray-600">
                            {row.product?.ref ?? `#${row.productId}`}
                          </span>
                          {row.product?.label && (
                            <span className="text-xs text-gray-400 truncate max-w-[160px]">
                              {row.product.label}
                            </span>
                          )}
                        </div>
                      )}
                      style={{ width: '180px' }}
                    />
                    <Column
                      header="Etiqueta"
                      body={(row: StockMovement) => row.label ?? '-'}
                    />
                    <Column
                      field="inventoryCode"
                      header="Cód. Ref."
                      style={{ width: '120px' }}
                      body={(row: StockMovement) => (
                        <span className="text-xs text-gray-500">{row.inventoryCode ?? '-'}</span>
                      )}
                    />
                    <Column
                      field="quantity"
                      header="Cant."
                      style={{ width: '80px', textAlign: 'right' }}
                      bodyStyle={{ textAlign: 'right' }}
                      body={(row: StockMovement) => formatQty(row.quantity)}
                    />
                  </DataTable>

                  {/* Paginación */}
                  {movements && movements.total > 25 && (
                    <div className="flex items-center justify-between px-2 py-3 border-t border-gray-100 text-sm text-gray-500">
                      <span>
                        Mostrando {((movPage - 1) * 25) + 1}–{Math.min(movPage * 25, movements.total)} de {movements.total}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          icon="pi pi-angle-left"
                          text
                          size="small"
                          disabled={movPage <= 1}
                          onClick={() => setMovPage((p) => p - 1)}
                        />
                        <span className="px-2 py-1">Pág. {movPage} / {Math.ceil(movements.total / 25)}</span>
                        <Button
                          icon="pi pi-angle-right"
                          text
                          size="small"
                          disabled={movPage >= Math.ceil(movements.total / 25)}
                          onClick={() => setMovPage((p) => p + 1)}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabPanel>
          </TabView>
        </div>
      </div>
    </>
  );
}
