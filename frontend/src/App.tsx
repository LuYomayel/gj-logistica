import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppLayout } from './shared/components/Layout/AppLayout';
import { PrivateRoute } from './shared/components/PrivateRoute';
import { AdminRoute } from './shared/components/AdminRoute';
import { useAuth } from './shared/hooks/useAuth';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProductStatsPage from './pages/ProductStatsPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import OrderStatsPage from './pages/OrderStatsPage';
import ContactsPage from './pages/ContactsPage';
import ContactDetailPage from './pages/ContactDetailPage';
import UsersPage from './pages/UsersPage';
import InventoriesPage from './pages/InventoriesPage';
import InventoryDetailPage from './pages/InventoryDetailPage';
import StockAtDatePage from './pages/StockAtDatePage';
import WarehousesPage from './pages/WarehousesPage';
import WarehouseDetailPage from './pages/WarehouseDetailPage';
import ThirdPartiesPage from './pages/ThirdPartiesPage';
import ThirdPartyDetailPage from './pages/ThirdPartyDetailPage';
import OrganizacionesPage from './pages/admin/TenantsPage';
import OrganizacionDetailPage from './pages/admin/TenantDetailPage';
import PermissionGroupsPage from './pages/admin/PermissionGroupsPage';
import PermissionGroupDetailPage from './pages/admin/PermissionGroupDetailPage';

/** Protects routes by permission — redirects to dashboard if user lacks it */
function PermissionRoute({ permission }: { permission: string }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<PrivateRoute />}>
        <Route element={<AppLayout />}>
          {/* Dashboard — always accessible */}
          <Route path="/" element={<DashboardPage />} />

          {/* Orders — requires orders.read */}
          <Route element={<PermissionRoute permission="orders.read" />}>
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/stats" element={<OrderStatsPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
          </Route>

          {/* Products — requires products.read */}
          <Route element={<PermissionRoute permission="products.read" />}>
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/stats" element={<ProductStatsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
          </Route>

          {/* Third Parties — requires third_parties.read */}
          <Route element={<PermissionRoute permission="third_parties.read" />}>
            <Route path="/third-parties" element={<ThirdPartiesPage />} />
            <Route path="/third-parties/:id" element={<ThirdPartyDetailPage />} />
          </Route>

          {/* Contacts — requires contacts.read */}
          <Route element={<PermissionRoute permission="contacts.read" />}>
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/contacts/:id" element={<ContactDetailPage />} />
          </Route>

          {/* Warehouses — requires stock.read */}
          <Route element={<PermissionRoute permission="stock.read" />}>
            <Route path="/warehouses" element={<WarehousesPage />} />
            <Route path="/warehouses/:id" element={<WarehouseDetailPage />} />
          </Route>

          {/* Inventories — requires stock.read_inventories */}
          <Route element={<PermissionRoute permission="stock.read_inventories" />}>
            <Route path="/inventories" element={<InventoriesPage />} />
            <Route path="/inventories/:id" element={<InventoryDetailPage />} />
          </Route>

          {/* Stock at date — requires stock.read_movements */}
          <Route element={<PermissionRoute permission="stock.read_movements" />}>
            <Route path="/stock/at-date" element={<StockAtDatePage />} />
          </Route>

          {/* Users — requires users.read */}
          <Route element={<PermissionRoute permission="users.read" />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>

          {/* Admin routes — super_admin only */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/organizaciones" element={<OrganizacionesPage />} />
            <Route path="/admin/organizaciones/:id" element={<OrganizacionDetailPage />} />
            <Route path="/admin/permission-groups" element={<PermissionGroupsPage />} />
            <Route path="/admin/permission-groups/:id" element={<PermissionGroupDetailPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
