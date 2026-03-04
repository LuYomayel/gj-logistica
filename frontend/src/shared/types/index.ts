// ── Multi-tenancy & Permissions ───────────────────────────────────────────

export type UserType = 'super_admin' | 'client_admin' | 'client_user';

export interface AuthUser {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  isAdmin: boolean;
  userType: UserType;
  tenantId: number | null;  // null for super_admin
  entity?: number;          // raw entity column value from backend
  /** Effective permissions: ['*'] for super_admin/client_admin, specific list for client_user */
  permissions: string[];
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Product {
  id: number;
  ref: string;
  label: string | null;
  description: string | null;
  barcode: string | null;
  stock: number;
  stockAlertThreshold: number;
  desiredStock: number;
  price: string | null;
  priceTTC: string | null;
  vatRate: string | null;
  isSellable: number;
  isBuyable: number;
  status: number;
  productType: number;
  rubro: string | null;
  subrubro: string | null;
  marca: string | null;
  talle: string | null;
  color: string | null;
  posicion: string | null;
  nivelEconomico: string | null;
  eanInterno: string | null;
  keywords: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderLine {
  id: number;
  orderId: number;
  productId: number | null;
  label: string | null;
  description: string | null;
  quantity: number;
  unitPrice: string | null;
  totalHT: string | null;
  totalTax: string | null;
  totalTTC: string | null;
  vatRate: string | null;
  discountPercent: number | null;
  position: number | null;
  product?: { ref: string; label: string | null };
}

export interface Order {
  id: number;
  ref: string;
  clientRef: string | null;
  thirdPartyId: number;
  status: number;
  isDraft: boolean;
  isBilled: boolean;
  orderDate: string | null;
  deliveryDate: string | null;
  validatedAt: string | null;
  totalHT: string | null;
  totalTax: string | null;
  totalTTC: string | null;
  publicNote: string | null;
  privateNote: string | null;
  nroSeguimiento: string | null;
  agencia: string | null;
  createdAt: string;
  updatedAt: string;
  thirdParty?: { id: number; name: string };
  createdBy?: { id: number; firstName: string | null; lastName: string | null; username: string };
  lines?: OrderLine[];
}

export interface Contact {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phonePro: string | null;
  phoneMobile: string | null;
  postalCode: string | null;
  address: string | null;
  city: string | null;
  status: number;
  thirdPartyId: number | null;
  marca: string | null;
  dni: number | null;
  lugarDeEntrega: string | null;
  nombreFantasia: string | null;
  alias: string | null;
  thirdParty?: { id: number; name: string };
}

export interface User {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  isAdmin: boolean;
  userType: UserType;
  entity: number;            // tenantId
  status: number;
  language: string | null;
  groups?: { id: number; name: string }[];
}

export interface ThirdParty {
  id: number;
  name: string;
  clientCode: string | null;
  email: string | null;
  phone: string | null;
}

export interface Warehouse {
  id: number;
  name: string;
  shortName: string | null;
  description: string | null;
  location: string | null;
  address: string | null;
  phone: string | null;
  status: number;
  createdAt?: string;
}

export interface ProductStock {
  id: number;
  warehouseId: number;
  productId: number;
  quantity: number;
  product?: { id: number; ref: string; label: string | null };
}

export const ORDER_STATUS: Record<number, { label: string; severity: 'secondary' | 'info' | 'warning' | 'success' | 'danger' }> = {
  '-1': { label: 'Cancelado', severity: 'danger' },
  0:    { label: 'Borrador',  severity: 'secondary' },
  1:    { label: 'Validado',  severity: 'info' },
  2:    { label: 'En Proceso', severity: 'warning' },
  3:    { label: 'Despachado', severity: 'success' },
};

// ── Inventories ───────────────────────────────────────────────────────────

export interface InventoryLine {
  id: number;
  inventoryId: number;
  warehouseId: number | null;
  productId: number | null;
  expectedQuantity: number | null;
  realQuantity: number | null;
  createdByUserId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Inventory {
  id: number;
  ref: string;
  label: string | null;
  warehouseId: number | null;
  productId: number | null;
  inventoryDate: string | null;
  status: number; // 0=borrador, 1=validado
  createdByUserId: number | null;
  createdAt: string;
  updatedAt: string;
  warehouse?: { id: number; name: string } | null;
  lines?: InventoryLine[];
}

export const INVENTORY_STATUS: Record<number, { label: string; severity: 'secondary' | 'success' }> = {
  0: { label: 'Borrador',  severity: 'secondary' },
  1: { label: 'Validado',  severity: 'success' },
};

// ── Stock ─────────────────────────────────────────────────────────────────

export interface StockMovement {
  id: number;
  warehouseId: number;
  productId: number;
  quantity: number;
  movementType: number;
  originType: string | null;
  originId: number | null;
  label: string | null;
  inventoryCode: string | null;
  movedAt: string;
  product?: { ref: string; label: string | null };
  warehouse?: { id: number; name: string };
}

export interface StockAtDateItem {
  productId: number;
  ref: string;
  label: string | null;
  stockAtDate: number;
  currentStock: number;
}

// ── Stats ─────────────────────────────────────────────────────────────────

export interface ProductPopularItem {
  productId: number;
  ref: string;
  label: string | null;
  rubro: string | null;
  orderCount: number;
  totalQuantity: number;
}

export interface ProductStats {
  popularProducts: ProductPopularItem[];
  byRubro: { rubro: string | null; productCount: number; orderCount: number }[];
}

export interface OrderStatsByMonth {
  year: number;
  month: number;
  count: number;
  totalQuantity: number;
}

export interface OrderStats {
  byMonth: OrderStatsByMonth[];
  byStatus: { status: number; count: number }[];
}

// ── Multi-tenancy & Permissions (extended) ────────────────────────────────

export interface Tenant {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: number;
  module: string;
  action: string;
  label: string;
  description: string | null;
  isAdvanced: boolean;
  isActive: boolean;
}

export interface PermissionGroup {
  id: number;
  tenantId: number | null;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionGroupWithPerms extends PermissionGroup {
  permissions?: Permission[];
}

export interface UserPermissionOverride {
  id: number;
  userId: number;
  permissionId: number;
  granted: boolean;
}

export interface EffectivePermissions {
  effective: string[];
  overrides: UserPermissionOverride[];
}
