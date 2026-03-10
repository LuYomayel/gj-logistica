import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { TabView, TabPanel } from 'primereact/tabview';
import { Button } from 'primereact/button';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { productsApi } from '../api/productsApi';
import { useAuth } from '../../../shared/hooks/useAuth';
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
  const { hasPermission } = useAuth();

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['products', id],
    queryFn: () => productsApi.get(id),
  });

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

  const formatPrice = (p: string | null) =>
    p ? `$${parseFloat(p).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-';

  return (
    <div className="flex flex-col gap-4">
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
            <Tag
              value={product.isSellable ? 'En venta' : 'No en venta'}
              severity={product.isSellable ? 'success' : 'warning'}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {hasPermission('products.write') && (
            <Button label="Modificar" icon="pi pi-pencil" outlined className="px-4 py-2" />
          )}
          {hasPermission('products.write') && (
            <Button label="Clonar" icon="pi pi-clone" outlined severity="secondary" className="px-4 py-2" />
          )}
          {hasPermission('products.delete') && (
            <Button label="Borrar" icon="pi pi-trash" outlined severity="danger" className="px-4 py-2" />
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
                  <InfoRow label="Posición" value={product.posicion} />
                  <InfoRow label="Nivel Económico" value={product.nivelEconomico} />
                  <InfoRow label="EAN Interno" value={product.eanInterno} />
                  <InfoRow label="Keywords" value={product.keywords} />
                  <InfoRow
                    label="Creado"
                    value={new Date(product.createdAt).toLocaleDateString('es-AR')}
                  />
                </div>
              </div>
            </div>
          </TabPanel>

          {/* Tab: Precios de venta */}
          <TabPanel header="Precios de venta">
            <div className="p-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Precios
                  </h3>
                  <InfoRow label="Precio (Neto)" value={formatPrice(product.price)} />
                  <InfoRow label="Precio (con IVA)" value={formatPrice(product.priceTTC)} />
                  <InfoRow
                    label="Tasa IVA"
                    value={product.vatRate ? `${product.vatRate}%` : '-'}
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
                  <InfoRow label="Stock deseado" value={product.desiredStock} />
                  <InfoRow label="Alerta de stock" value={product.stockAlertThreshold} />
                  <div className="mt-4">
                    {product.stock <= product.stockAlertThreshold ? (
                      <Tag value="Stock bajo" severity="danger" icon="pi pi-exclamation-triangle" />
                    ) : (
                      <Tag value="Stock OK" severity="success" icon="pi pi-check" />
                    )}
                  </div>
                </div>
              </div>
            </div>
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
