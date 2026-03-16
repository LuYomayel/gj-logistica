import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSidebar } from './AppLayout';

interface NavItem {
  label: string;
  icon: string;
  to: string;
  end?: boolean;
  permission?: string | null;
}

interface NavSection {
  id: string;
  /** Route prefixes that activate this section in the sidebar */
  matchPrefixes: string[];
  items: NavItem[];
  superAdminOnly?: boolean;
}

const navSections: NavSection[] = [
  {
    id: 'comercial',
    matchPrefixes: ['/orders', '/third-parties', '/contacts'],
    items: [
      { label: 'Pedidos',       icon: 'pi pi-file-edit',  to: '/orders',         permission: 'orders.read' },
      { label: 'Stats Pedidos', icon: 'pi pi-chart-line', to: '/orders/stats',   permission: 'orders.read' },
      { label: 'Terceros',      icon: 'pi pi-building',   to: '/third-parties',  permission: 'third_parties.read' },
      { label: 'Contactos',     icon: 'pi pi-users',      to: '/contacts',       permission: 'contacts.read' },
    ],
  },
  {
    id: 'almacen',
    matchPrefixes: ['/warehouses', '/products', '/inventories', '/stock'],
    items: [
      { label: 'Almacenes',       icon: 'pi pi-warehouse', to: '/warehouses',     permission: 'stock.read' },
      { label: 'Productos',       icon: 'pi pi-box',       to: '/products',       permission: 'products.read' },
      { label: 'Stats Productos', icon: 'pi pi-chart-pie', to: '/products/stats', permission: 'products.read' },
      { label: 'Inventarios',     icon: 'pi pi-clipboard', to: '/inventories',    permission: 'stock.read_inventories' },
      { label: 'Stock a fecha',   icon: 'pi pi-calendar',  to: '/stock/at-date',  permission: 'stock.read_movements' },
    ],
  },
  {
    id: 'admin',
    matchPrefixes: ['/users'],
    items: [
      { label: 'Usuarios y grupos', icon: 'pi pi-user', to: '/users', permission: 'users.read' },
    ],
  },
  {
    id: 'superadmin',
    matchPrefixes: ['/admin'],
    superAdminOnly: true,
    items: [
      { label: 'Organizaciones',     icon: 'pi pi-building', to: '/admin/organizaciones' },
      { label: 'Grupos de Permisos', icon: 'pi pi-shield',   to: '/admin/permission-groups' },
    ],
  },
];

export function Sidebar() {
  const { hasPermission, isSuperAdmin, user } = useAuth();
  const { isOpen, close } = useSidebar();
  const location = useLocation();

  // Find which section is active based on current route
  const activeSection = navSections.find((section) => {
    if (section.superAdminOnly && !isSuperAdmin) return false;
    return section.matchPrefixes.some((p) => location.pathname.startsWith(p));
  });

  // Filter items by permission
  const visibleItems = activeSection
    ? (activeSection.superAdminOnly
        ? activeSection.items
        : activeSection.items.filter((item) =>
            !item.permission ? true : hasPermission(item.permission),
          ))
    : [];

  // Don't render sidebar on dashboard or if no items
  if (!activeSection || visibleItems.length === 0) {
    return (
      <aside className={`
        fixed top-[54px] left-0 bottom-0 w-[210px] bg-white border-r border-gray-200
        overflow-y-auto z-40 flex flex-col shadow-sm
        transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <nav className="flex flex-col flex-1 pt-4 px-3">
          <NavLink
            to="/"
            end
            onClick={close}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm no-underline transition-all duration-150 ${
                isActive
                  ? 'bg-blue-50 text-[#1b3a5f] font-semibold shadow-sm border border-blue-100'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-[#1b3a5f]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <i className={`pi pi-chart-bar text-sm ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>Mi Tablero</span>
              </>
            )}
          </NavLink>
        </nav>
        <SidebarFooter user={user} isSuperAdmin={isSuperAdmin} />
      </aside>
    );
  }

  return (
    <aside className={`
      fixed top-[54px] left-0 bottom-0 w-[210px] bg-white border-r border-gray-200
      overflow-y-auto z-40 flex flex-col shadow-sm
      transition-transform duration-200 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:translate-x-0
    `}>
      <nav className="flex flex-col flex-1 pt-2 pb-2">
        <div className="flex flex-col gap-0.5 px-2 pt-2">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end ?? false}
              onClick={close}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm no-underline transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-50 text-[#1b3a5f] font-semibold shadow-sm border border-blue-100'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-[#1b3a5f]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <i className={`${item.icon} text-sm ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
      <SidebarFooter user={user} isSuperAdmin={isSuperAdmin} />
    </aside>
  );
}

function SidebarFooter({ user, isSuperAdmin }: { user: ReturnType<typeof useAuth>['user']; isSuperAdmin: boolean }) {
  return (
    <div className="px-4 py-3 border-t border-gray-100">
      {user && (
        <div className="flex items-center justify-center mb-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            isSuperAdmin ? 'bg-orange-100 text-orange-600' :
            user.userType === 'client_admin' ? 'bg-blue-100 text-blue-600' :
            'bg-gray-100 text-gray-500'
          }`}>
            {isSuperAdmin ? 'Super Admin' : user.userType === 'client_admin' ? 'Admin' : 'Usuario'}
          </span>
        </div>
      )}
      <p className="text-[10px] text-gray-300 text-center">GJ Logística v1.0</p>
    </div>
  );
}
