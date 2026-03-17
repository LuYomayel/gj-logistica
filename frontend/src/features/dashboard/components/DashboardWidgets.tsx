import { useQuery } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Card } from 'primereact/card';
import { Skeleton } from 'primereact/skeleton';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../../products/api/productsApi';
import { ordersApi } from '../../orders/api/ordersApi';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { useAuth } from '../../../shared/hooks/useAuth';
import type { Product, Order } from '../../../shared/types';

function StockAlertWidget() {
  const navigate = useNavigate();
  const { data: alertProducts = [], isLoading } = useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: () => productsApi.getLowStock(),
  });

  if (isLoading) {
    return (
      <Card title="Productos con stock bajo" className="h-full">
        <Skeleton height="200px" />
      </Card>
    );
  }

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <i className="pi pi-exclamation-triangle text-orange-500" />
          Productos con stock bajo
          <span className="ml-auto text-sm font-normal bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
            {alertProducts.length}
          </span>
        </span>
      }
      className="h-full"
    >
      <DataTable
        value={alertProducts.slice(0, 10)}
        size="small"
        emptyMessage="Sin alertas de stock"
        rowClassName={() => 'cursor-pointer'}
        onRowClick={(e) => navigate(`/products/${(e.data as Product).id}`)}
        scrollable
        scrollHeight="260px"
      >
        <Column field="ref" header="Ref" style={{ width: '100px' }} />
        <Column field="label" header="Producto" />
        <Column
          field="stock"
          header="Stock"
          style={{ width: '80px' }}
          body={(row: Product) => (
            <span className="font-semibold text-red-600">{row.stock}</span>
          )}
        />
        <Column
          field="stockAlertThreshold"
          header="Mínimo"
          style={{ width: '80px' }}
        />
      </DataTable>
    </Card>
  );
}

function RecentOrdersWidget() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'dashboard'],
    queryFn: () => ordersApi.list({ limit: 10 }),
  });

  const orders = data?.data ?? [];

  if (isLoading) {
    return (
      <Card title="Últimos pedidos" className="h-full">
        <Skeleton height="200px" />
      </Card>
    );
  }

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('es-AR') : '-';

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <i className="pi pi-shopping-cart text-blue-500" />
          Últimos pedidos
        </span>
      }
      className="h-full"
    >
      <DataTable
        value={orders}
        size="small"
        emptyMessage="Sin pedidos"
        rowClassName={() => 'cursor-pointer'}
        onRowClick={(e) => navigate(`/orders/${(e.data as Order).id}`)}
        scrollable
        scrollHeight="260px"
      >
        <Column field="ref" header="Ref" style={{ width: '120px' }} />
        <Column
          field="thirdParty.name"
          header="Tercero"
          body={(row: Order) => row.thirdParty?.name ?? '-'}
        />
        <Column
          field="orderDate"
          header="Fecha"
          style={{ width: '100px' }}
          body={(row: Order) => formatDate(row.orderDate)}
        />
        <Column
          field="status"
          header="Estado"
          style={{ width: '120px' }}
          body={(row: Order) => <StatusBadge status={row.status} />}
        />
        <Column
          field="totalTTC"
          header="Total"
          style={{ width: '100px' }}
          body={(row: Order) =>
            row.totalTTC
              ? `$${parseFloat(row.totalTTC).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
              : '-'
          }
        />
      </DataTable>
    </Card>
  );
}

export function DashboardWidgets() {
  const { hasPermission } = useAuth();

  const canSeeStock = hasPermission('products.read') || hasPermission('stock.read');
  const canSeeOrders = hasPermission('orders.read');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1b3a5f] mb-1">Mi Tablero</h1>
        <p className="text-gray-500 text-sm">Resumen general del sistema</p>
      </div>

      {(canSeeStock || canSeeOrders) ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {canSeeStock && <StockAlertWidget />}
          {canSeeOrders && <RecentOrdersWidget />}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
          <i className="pi pi-chart-bar text-5xl" />
          <p className="text-sm">No tenés permisos para ver widgets del tablero.</p>
          <p className="text-xs">Contactá a un administrador para obtener acceso.</p>
        </div>
      )}
    </div>
  );
}
