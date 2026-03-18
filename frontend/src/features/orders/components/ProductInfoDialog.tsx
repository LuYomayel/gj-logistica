import { Dialog } from 'primereact/dialog';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../products/api/productsApi';
import { useAuth } from '../../../shared/hooks/useAuth';
import type { Product } from '../../../shared/types';

interface Props {
  productId: number | null;
  visible: boolean;
  onHide: () => void;
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b border-gray-50">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export function ProductInfoDialog({ productId, visible, onHide }: Props) {
  const { hasPermission } = useAuth();

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['products', productId],
    queryFn: () => productsApi.get(productId!),
    enabled: visible && productId !== null,
  });

  return (
    <Dialog
      header="Ficha del Producto"
      visible={visible}
      onHide={onHide}
      style={{ width: '480px' }}
      breakpoints={{ '768px': '95vw', '575px': '100vw' }}
      modal
      draggable={false}
    >
      {isLoading && (
        <div className="flex flex-col gap-2 p-2">
          <Skeleton height="20px" />
          <Skeleton height="20px" />
          <Skeleton height="20px" />
        </div>
      )}

      {product && (
        <div className="flex flex-col gap-4 pt-1">
          {/* Header with ref + label */}
          <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
            <Tag value={product.ref} severity="info" className="font-mono" />
            <span className="text-base font-semibold text-gray-800 leading-tight">
              {product.label ?? 'Sin nombre'}
            </span>
          </div>

          {/* Info section */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Datos</p>
            {product.description && (
              <p className="text-sm text-gray-600 mb-2 bg-gray-50 rounded px-3 py-2">{product.description}</p>
            )}
            <InfoRow label="Código de barras" value={product.barcode} />
            <InfoRow label="Stock actual" value={product.stock} />
            {hasPermission('products.read_position') && (
              <InfoRow label="Posición" value={product.posicion} />
            )}
          </div>

          {/* Classification */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Clasificación</p>
            <div className="flex flex-wrap gap-2">
              {product.rubro && (
                <Tag value={product.rubro} severity="secondary" className="text-xs" />
              )}
              {product.subrubro && (
                <Tag value={product.subrubro} severity="secondary" className="text-xs" />
              )}
              {product.marca && (
                <Tag value={`Marca: ${product.marca}`} severity="secondary" className="text-xs" />
              )}
              {product.talle && (
                <Tag value={`Talle: ${product.talle}`} severity="secondary" className="text-xs" />
              )}
              {product.color && (
                <Tag value={`Color: ${product.color}`} severity="secondary" className="text-xs" />
              )}
            </div>
            {!product.rubro && !product.subrubro && !product.marca && !product.talle && !product.color && (
              <p className="text-sm text-gray-400 italic">Sin clasificación</p>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
