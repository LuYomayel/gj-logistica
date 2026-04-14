import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { TabView, TabPanel } from 'primereact/tabview';
import { Button } from 'primereact/button';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { productsApi } from '../api/productsApi';
import { EditProductDialog } from './EditProductDialog';
import { ProductImageTab } from './ProductImageTab';
import { useAuth } from '../../../shared/hooks/useAuth';
import { canManageTenants } from '../../../shared/hooks/useTenants';
import { apiErrMsg } from '../../../shared/utils/apiErrMsg';
import type { Product } from '../../../shared/types';

interface InfoRowProps {
  label: string;
  value: string | number | null | undefined;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex flex-col sm:flex-row border-b border-gray-100 py-2">
      <span className="sm:w-[200px] sm:shrink-0 text-sm font-medium text-gray-500">{label}</span>
      <span className="text-sm text-gray-800">{value ?? '-'}</span>
    </div>
  );
}

interface Props {
  id: number;
}

export function ProductDetail({ id }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, user } = useAuth();
  const showTenant = canManageTenants(user?.userType);
  const toast = useRef<Toast>(null);
  const [showEdit, setShowEdit] = useState(false);

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['products', id],
    queryFn: () => productsApi.get(id),
  });

  const cloneMut = useMutation({
    mutationFn: () => {
      if (!product) throw new Error('No product');
      return productsApi.create({
        ref: product.ref + '-CLON',
        label: product.label ?? undefined,
        description: product.description ?? undefined,
        barcode: undefined,
        talle: product.talle ?? undefined,
        rubro: product.rubro ?? undefined,
        subrubro: product.subrubro ?? undefined,
        marca: product.marca ?? undefined,
        color: product.color ?? undefined,
        posicion: product.posicion ?? undefined,
      });
    },
    onSuccess: (cloned) => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.current?.show({ severity: 'success', summary: 'Producto clonado', detail: `Se creó "${cloned.ref}"`, life: 3000 });
      navigate(`/products/${cloned.id}`);
    },
    onError: (err) => {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: apiErrMsg(err, 'No se pudo clonar el producto'), life: 4000 });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => productsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.current?.show({ severity: 'success', summary: 'Producto eliminado', life: 3000 });
      navigate('/products');
    },
    onError: (err) => {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: apiErrMsg(err, 'No se pudo eliminar el producto'), life: 4000 });
    },
  });

  const handleDelete = () => {
    confirmDialog({
      message: `¿Eliminar el producto "${product?.ref}"? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'bg-red-600 text-white border-red-600',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => deleteMut.mutate(),
    });
  };

  const handleClone = () => {
    confirmDialog({
      message: `¿Clonar el producto "${product?.ref}"? Se creará una copia con ref "${product?.ref}-CLON".`,
      header: 'Confirmar clonación',
      icon: 'pi pi-clone',
      acceptLabel: 'Clonar',
      rejectLabel: 'Cancelar',
      accept: () => cloneMut.mutate(),
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton height="60px" />
        <Skeleton height="400px" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20 text-gray-500">
        <i className="pi pi-inbox text-5xl mb-4 block" />
        Producto no encontrado
      </div>
    );
  }

  const isMutating = cloneMut.isPending || deleteMut.isPending;

  return (
    <div className="flex flex-col gap-4">
      <Toast ref={toast} />
      <ConfirmDialog />

      {showEdit && (
        <EditProductDialog
          visible={showEdit}
          onHide={() => setShowEdit(false)}
          product={product}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ['products', id] });
            toast.current?.show({ severity: 'success', summary: 'Cambios guardados', detail: `"${product.ref}" actualizado`, life: 3000 });
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Button
              icon="pi pi-arrow-left"
              text
              onClick={() => navigate('/products')}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2"
            />
            <h1 className="text-xl sm:text-2xl font-bold text-[#1b3a5f]">
              {product.ref} — {product.label ?? 'Sin nombre'}
            </h1>
          </div>
          <div className="flex gap-2 ml-8">
            {product.barcode && (
              <Tag value={product.barcode} severity="secondary" icon="pi pi-barcode" />
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {hasPermission('products.write') && (
            <Button
              label="Modificar"
              icon="pi pi-pencil"
              outlined
              className="px-4 py-2"
              onClick={() => setShowEdit(true)}
              disabled={isMutating}
            />
          )}
          {hasPermission('products.write') && (
            <Button
              label="Clonar"
              icon="pi pi-clone"
              outlined
              severity="secondary"
              className="px-4 py-2"
              onClick={handleClone}
              loading={cloneMut.isPending}
              disabled={isMutating}
            />
          )}
          {hasPermission('products.delete') && (
            <Button
              label="Borrar"
              icon="pi pi-trash"
              outlined
              severity="danger"
              className="px-4 py-2"
              onClick={handleDelete}
              loading={deleteMut.isPending}
              disabled={isMutating}
            />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <TabView>
          {/* Tab: Producto */}
          <TabPanel header="Producto">
            <div className="p-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Información general
                  </h3>
                  <InfoRow label="Referencia" value={product.ref} />
                  {showTenant && (
                    <InfoRow label="Organización" value={product.tenant?.name ?? `#${product.entity}`} />
                  )}
                  <InfoRow label="Etiqueta" value={product.label} />
                  <InfoRow label="Descripción" value={product.description} />
                  <InfoRow label="Código de barras" value={product.barcode} />
                  <InfoRow label="Rubro" value={product.rubro} />
                  <InfoRow label="Subrubro" value={product.subrubro} />
                  <InfoRow label="Marca" value={product.marca} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Atributos
                  </h3>
                  <InfoRow label="Talle" value={product.talle} />
                  <InfoRow label="Color" value={product.color} />
                  {hasPermission('products.read_position') && (
                    <InfoRow label="Posición" value={product.posicion} />
                  )}
                  <InfoRow
                    label="Creado"
                    value={new Date(product.createdAt).toLocaleDateString('es-AR')}
                  />
                </div>
              </div>
            </div>
          </TabPanel>

          {/* Tab: Stock */}
          <TabPanel header="Stock">
            <div className="p-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Stock actual
                  </h3>
                  <InfoRow label="Stock físico" value={product.stock} />
                </div>
              </div>
            </div>
          </TabPanel>

          {/* Tab: Imagen */}
          <TabPanel header="Imagen">
            <ProductImageTab productId={id} />
          </TabPanel>

          {/* Tab: Notas */}
          <TabPanel header="Notas">
            <div className="p-2 min-h-[100px]">
              <p className="text-gray-500 text-sm italic">Sin notas registradas.</p>
            </div>
          </TabPanel>
        </TabView>
      </div>
    </div>
  );
}
