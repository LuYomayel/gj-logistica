import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './shared/components/Layout/AppLayout';
import { PrivateRoute } from './shared/components/PrivateRoute';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProductStatsPage from './pages/ProductStatsPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import OrderStatsPage from './pages/OrderStatsPage';
import ContactsPage from './pages/ContactsPage';
import UsersPage from './pages/UsersPage';
import InventoriesPage from './pages/InventoriesPage';
import InventoryDetailPage from './pages/InventoryDetailPage';
import StockAtDatePage from './pages/StockAtDatePage';
import WarehousesPage from './pages/WarehousesPage';
import WarehouseDetailPage from './pages/WarehouseDetailPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<PrivateRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          {/* Products — /stats must come before /:id to avoid param conflict */}
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/stats" element={<ProductStatsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          {/* Orders — /stats must come before /:id */}
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/stats" element={<OrderStatsPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          {/* Inventories */}
          <Route path="/inventories" element={<InventoriesPage />} />
          <Route path="/inventories/:id" element={<InventoryDetailPage />} />
          {/* Warehouses */}
          <Route path="/warehouses" element={<WarehousesPage />} />
          <Route path="/warehouses/:id" element={<WarehouseDetailPage />} />
          {/* Stock */}
          <Route path="/stock/at-date" element={<StockAtDatePage />} />
          {/* Other */}
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
