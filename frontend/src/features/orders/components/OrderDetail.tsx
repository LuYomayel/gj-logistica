import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Skeleton } from 'primereact/skeleton';
import { Toast } from 'primereact/toast';
import { AutoComplete } from 'primereact/autocomplete';
import type { AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { InputNumber } from 'primereact/inputnumber';
import { useRef, useState } from 'react';
import { ordersApi, type AddOrderLinePayload } from '../api/ordersApi';
import { productsApi } from '../../products/api/productsApi';
import { apiErrMsg } from '../../../shared/utils/apiErrMsg';
import { EditOrderDialog } from './EditOrderDialog';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { useAuth } from '../../../shared/hooks/useAuth';
import type { Order, OrderLine, Product } from '../../../shared/types';

interface InfoRowProps {
  label: string;
  value: string | number | boolean | null | undefined;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex flex-col sm:flex-row border-b border-gray-100 py-2">
      <span className="sm:w-[180px] sm:shrink-0 text-sm font-medium text-gray-500">{label}</span>
      <span className="text-sm text-gray-800">
        {value === true ? 'Sí' : value === false ? 'No' : (value ?? '-')}
      </span>
    </div>
  );
}

interface Props {
  id: number;
}

export function OrderDetail({ id }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useRef<Toast>(null);
  const { hasPermission } = useAuth();

  const [showEdit, setShowEdit] = useState(false);

  // ── Agregar línea state ─────────────────────────────────────
  // productInput holds the typed string while searching, or the Product object when selected
  const [productInput, setProductInput] = useState<string | Product>('');
  const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);
  const [lineQty, setLineQty] = useState<number>(1);
  // Derived: only a Product (not string) means something is actually selected
  const selectedProduct: Product | null =
    productInput !== '' && typeof productInput !== 'string' ? (productInput as Product) : null;

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['orders', id],
    queryFn: () => ordersApi.get(id),
  });

  const showSuccess = (msg: string) =>
    toast.current?.show({ severity: 'success', summary: 'OK', detail: msg, life: 3000 });
  const showError = (msg: string) =>
    toast.current?.show({ severity: 'error', summary: 'Error', detail: msg, life: 4000 });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['orders', id] });
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  // ── Status transitions ──────────────────────────────────────
  const validateMut = useMutation({
    mutationFn: () => ordersApi.validate(id),
    onSuccess: () => { showSuccess('Pedido validado'); invalidate(); },
    onError: (err) => showError(apiErrMsg(err, 'Error al validar el pedido')),
  });

  const closeMut = useMutation({
    mutationFn: () => ordersApi.close(id),
    onSuccess: () => { showSuccess('Pedido despachado'); invalidate(); },
    onError: (err) => showError(apiErrMsg(err, 'Error al despachar el pedido')),
  });

  const cancelMut = useMutation({
    mutationFn: () => ordersApi.cancel(id),
    onSuccess: () => { showSuccess('Pedido cancelado'); invalidate(); },
    onError: (err) => showError(apiErrMsg(err, 'Error al cancelar el pedido')),
  });

  const reopenMut = useMutation({
    mutationFn: () => ordersApi.reopen(id),
    onSuccess: () => { showSuccess('Pedido reabierto'); invalidate(); },
    onError: (err) => showError(apiErrMsg(err, 'Error al reabrir el pedido')),
  });

  const cloneMut = useMutation({
    mutationFn: () => ordersApi.clone(id),
    onSuccess: (newOrder) => navigate(`/orders/${newOrder.id}`),
    onError: (err) => showError(apiErrMsg(err, 'Error al clonar el pedido')),
  });

  // ── Line mutations ──────────────────────────────────────────
  const addLineMut = useMutation({
    mutationFn: (payload: AddOrderLinePayload) => ordersApi.addLine(id, payload),
    onSuccess: () => {
      showSuccess('Línea agregada');
      setProductInput('');
      setLineQty(1);
      invalidate();
    },
    onError: (err) => showError(apiErrMsg(err, 'Error al agregar la línea')),
  });

  const removeLineMut = useMutation({
    mutationFn: (lineId: number) => ordersApi.removeLine(id, lineId),
    onSuccess: () => { showSuccess('Línea eliminada'); invalidate(); },
    onError: (err) => showError(apiErrMsg(err, 'Error al eliminar la línea')),
  });

  // ── Product search ──────────────────────────────────────────
  const searchProducts = async (event: AutoCompleteCompleteEvent) => {
    const query = event.query.trim();
    if (query.length < 1) {
      setProductSuggestions([]);
      return;
    }
    try {
      const result = await productsApi.list({ search: query, limit: 30 });
      setProductSuggestions(result.data);
    } catch {
      setProductSuggestions([]);
    }
  };

  const handleAddLine = () => {
    const product = selectedProduct;
    if (!product) {
      toast.current?.show({ severity: 'warn', summary: 'Atención', detail: 'Seleccioná un producto', life: 3000 });
      return;
    }
    const available = product.stock ?? 0;
    if (available < lineQty) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Stock insuficiente',
        detail: `Disponible en almacén: ${available}, solicitado: ${lineQty}`,
        life: 5000,
      });
      return;
    }
    addLineMut.mutate({
      productId: product.id,
      quantity: lineQty,
    });
  };

  const productItemTemplate = (product: Product) => {
    const stock = product.stock ?? 0;
    const hasStock = stock > 0;
    return (
      <div className={`flex items-center gap-2 py-1 ${!hasStock ? 'opacity-60' : ''}`}>
        <span className="font-mono text-xs text-gray-500 shrink-0">{product.ref}</span>
        <span className="text-sm truncate">{product.label}</span>
        <span className={`ml-auto text-xs shrink-0 font-medium ${hasStock ? 'text-green-600' : 'text-orange-500'}`}>
          Stock: {stock}
        </span>
      </div>
    );
  };

  // ── Render guards ───────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton height="60px" />
        <Skeleton height="300px" />
        <Skeleton height="200px" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20 text-gray-500">
        <i className="pi pi-inbox text-5xl mb-4 block" />
        Pedido no encontrado
      </div>
    );
  }

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('es-AR') : '-';

  const formatAmount = (v: string | null) =>
    v ? `$${parseFloat(v).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-';

  const status = order.status;
  const isMutating =
    validateMut.isPending || closeMut.isPending || cancelMut.isPending || reopenMut.isPending;
  const isDraft = status === 0;
  const lines = order.lines ?? [];

  return (
    <>
      <Toast ref={toast} />

      {order && isDraft && (
        <EditOrderDialog
          visible={showEdit}
          onHide={() => setShowEdit(false)}
          order={order}
          onSaved={() => invalidate()}
        />
      )}

      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button
                icon="pi pi-arrow-left"
                text
                onClick={() => navigate('/orders')}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2"
              />
              <h1 className="text-xl sm:text-2xl font-bold text-[#1b3a5f]">{order.ref}</h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-sm text-gray-500 ml-8">
              {order.thirdParty?.name ?? 'Sin tercero'}
              {order.clientRef ? ` · Ref cliente: ${order.clientRef}` : ''}
            </p>
          </div>

          {/* Action buttons — gated by permission */}
          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            {status === 0 && hasPermission('orders.write') && (
              <Button
                label="Editar"
                icon="pi pi-pencil"
                outlined
                disabled={isMutating}
                onClick={() => setShowEdit(true)}
                className="px-4 py-2"
              />
            )}
            {status === 0 && hasPermission('orders.validate') && (
              <Button
                label="Validar"
                icon="pi pi-check"
                loading={validateMut.isPending}
                disabled={isMutating}
                onClick={() => validateMut.mutate()}
                className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700 px-4 py-2"
              />
            )}
            {(status === 1 || status === 2) && hasPermission('orders.close') && (
              <Button
                label="Despachar"
                icon="pi pi-send"
                severity="success"
                loading={closeMut.isPending}
                disabled={isMutating}
                onClick={() => closeMut.mutate()}
                className="px-4 py-2"
              />
            )}
            {(status === 0 || status === 1 || status === 2) && hasPermission('orders.cancel') && (
              <Button
                label="Cancelar"
                icon="pi pi-times"
                severity="danger"
                outlined
                loading={cancelMut.isPending}
                disabled={isMutating}
                onClick={() => cancelMut.mutate()}
                className="px-4 py-2"
              />
            )}
            {(status === 3 || status === -1) && hasPermission('orders.write') && (
              <Button
                label="Reabrir"
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                loading={reopenMut.isPending}
                disabled={isMutating}
                onClick={() => reopenMut.mutate()}
                className="px-4 py-2"
              />
            )}
            {hasPermission('orders.write') && (
              <Button
                label="Clonar"
                icon="pi pi-clone"
                outlined
                severity="secondary"
                loading={cloneMut.isPending}
                disabled={isMutating || cloneMut.isPending}
                onClick={() => cloneMut.mutate()}
                className="px-4 py-2"
              />
            )}
            {status >= 1 && (
              <Button
                label="Descargar PDF"
                icon="pi pi-file-pdf"
                outlined
                severity="secondary"
                onClick={() => void ordersApi.downloadPdf(id, order.ref)}
                className="px-4 py-2"
                tooltip="Descargar PDF del pedido"
                tooltipOptions={{ position: 'bottom' }}
              />
            )}
          </div>
        </div>

        {/* Info section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Información del pedido
              </h3>
              <InfoRow label="Referencia" value={order.ref} />
              <InfoRow label="Ref cliente" value={order.clientRef} />
              <InfoRow label="Tercero" value={order.thirdParty?.name} />
              <InfoRow label="Fecha pedido" value={formatDate(order.orderDate)} />
              <InfoRow label="Fecha prevista" value={formatDate(order.deliveryDate)} />
              <InfoRow label="Fecha validación" value={formatDate(order.validatedAt)} />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Totales y entrega
              </h3>
              <InfoRow label="Total Neto" value={formatAmount(order.totalHT)} />
              <InfoRow label="IVA" value={formatAmount(order.totalTax)} />
              <InfoRow label="Total con IVA" value={formatAmount(order.totalTTC)} />
              <InfoRow label="Agencia" value={order.agencia} />
              <InfoRow label="Nro. seguimiento" value={order.nroSeguimiento} />
              <InfoRow
                label="Autor"
                value={
                  order.createdBy
                    ? `${order.createdBy.firstName ?? ''} ${order.createdBy.lastName ?? ''}`.trim() ||
                      order.createdBy.username
                    : '-'
                }
              />
            </div>
          </div>

          {order.publicNote && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Nota pública
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.publicNote}</p>
            </div>
          )}
        </div>

        {/* Lines */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-[#1b3a5f]">
              Líneas del pedido ({lines.length})
            </h3>
          </div>

          <DataTable
            value={lines}
            size="small"
            emptyMessage="Sin líneas — agregá productos abajo"
            scrollable
          >
            <Column
              field="position"
              header="#"
              style={{ width: '50px', textAlign: 'center' }}
              bodyStyle={{ textAlign: 'center' }}
            />
            <Column
              field="product.ref"
              header="Ref"
              style={{ width: '120px', fontFamily: 'monospace' }}
              body={(row: OrderLine) => row.product?.ref ?? '-'}
            />
            <Column
              header="Producto / Descripción"
              body={(row: OrderLine) =>
                row.label ?? row.product?.label ?? row.description ?? '-'
              }
            />
            <Column
              field="quantity"
              header="Cant."
              style={{ width: '80px', textAlign: 'right' }}
              bodyStyle={{ textAlign: 'right' }}
            />
            <Column
              field="unitPrice"
              header="P.U. (neto)"
              style={{ width: '120px', textAlign: 'right' }}
              bodyStyle={{ textAlign: 'right' }}
              body={(row: OrderLine) => formatAmount(row.unitPrice)}
            />
            <Column
              field="discountPercent"
              header="Desc.%"
              style={{ width: '80px', textAlign: 'right' }}
              bodyStyle={{ textAlign: 'right' }}
              body={(row: OrderLine) =>
                row.discountPercent ? `${row.discountPercent}%` : '-'
              }
            />
            <Column
              field="totalHT"
              header="Total Neto"
              style={{ width: '130px', textAlign: 'right' }}
              bodyStyle={{ textAlign: 'right' }}
              body={(row: OrderLine) => formatAmount(row.totalHT)}
            />
            {/* Remove button — only for drafts AND if user can write orders */}
            {isDraft && hasPermission('orders.write') && (
              <Column
                header=""
                style={{ width: '50px', textAlign: 'center' }}
                bodyStyle={{ textAlign: 'center' }}
                body={(row: OrderLine) => (
                  <Button
                    icon="pi pi-trash"
                    text
                    severity="danger"
                    size="small"
                    loading={removeLineMut.isPending}
                    onClick={() => removeLineMut.mutate(row.id)}
                    className="p-1"
                  />
                )}
              />
            )}
          </DataTable>

          {/* Totals row */}
          {lines.length > 0 && (
            <div className="flex flex-wrap justify-end gap-3 sm:gap-6 px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm">
              <span className="text-gray-500">
                Neto: <strong className="text-gray-800">{formatAmount(order.totalHT)}</strong>
              </span>
              <span className="text-gray-500">
                IVA: <strong className="text-gray-800">{formatAmount(order.totalTax)}</strong>
              </span>
              <span className="text-gray-500">
                Total:{' '}
                <strong className="text-[#1b3a5f] text-base">{formatAmount(order.totalTTC)}</strong>
              </span>
            </div>
          )}

          {/* ── Agregar línea (only draft + orders.write) ── */}
          {isDraft && hasPermission('orders.write') && (
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Agregar nueva línea
              </p>
              <div className="flex flex-wrap items-end gap-3">
                {/* Product autocomplete */}
                <div className="flex flex-col gap-1 flex-1 min-w-[280px]">
                  <label className="text-xs font-medium text-gray-600">
                    Producto <span className="text-red-400">*</span>
                  </label>
                  <AutoComplete
                    value={productInput}
                    field="label"
                    suggestions={productSuggestions}
                    completeMethod={searchProducts}
                    itemTemplate={productItemTemplate}
                    selectedItemTemplate={(product: Product) =>
                      `${product.ref} — ${product.label ?? ''}`
                    }
                    onChange={(e) => setProductInput(e.value as string | Product)}
                    placeholder="Buscar por ref, nombre o marca..."
                    minLength={1}
                    delay={200}
                    className="w-full text-sm"
                    inputClassName="w-full text-sm"
                  />
                </div>

                {/* Quantity */}
                <div className="flex flex-col gap-1 w-[120px]">
                  <label className="text-xs font-medium text-gray-600">Cantidad</label>
                  <InputNumber
                    value={lineQty}
                    onValueChange={(e) => setLineQty(e.value ?? 1)}
                    min={1}
                    showButtons
                    buttonLayout="horizontal"
                    decrementButtonClassName="p-button-secondary p-button-outlined"
                    incrementButtonClassName="p-button-secondary p-button-outlined"
                    incrementButtonIcon="pi pi-plus"
                    decrementButtonIcon="pi pi-minus"
                    inputClassName="text-center text-sm w-[50px]"
                  />
                </div>

                {/* Add button */}
                <Button
                  label="Agregar"
                  icon="pi pi-plus"
                  loading={addLineMut.isPending}
                  disabled={!selectedProduct}
                  onClick={handleAddLine}
                  className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700 px-4 py-2"
                />
              </div>

              {/* Selected product stock hint */}
              {selectedProduct && (
                <p className="mt-2 text-xs text-gray-500">
                  <span className="font-medium">{selectedProduct.ref}</span>
                  {selectedProduct.label ? ` · ${selectedProduct.label}` : ''}
                  {' · '}
                  <span className={selectedProduct.stock > 0 ? 'text-green-600 font-medium' : 'text-orange-500 font-medium'}>
                    Stock actual: {selectedProduct.stock}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
