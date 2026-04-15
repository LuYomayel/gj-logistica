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
  label: string;
  icon: string;
  /** Route prefixes that activate this section in the sidebar */
  matchPrefixes: string[];
  items: NavItem[];
  superAdminOnly?: boolean;
  /** Section is visible if the user has ANY of these permissions */
  permissions?: string[];
}

const navSections: NavSection[] = [
  {
    id: 'comercial',
    label: 'Comercial',
    icon: 'pi pi-briefcase',
    matchPrefixes: ['/orders', '/contacts'],
    permissions: ['orders.read', 'contacts.read'],
    items: [
      { label: 'Pedidos',       icon: 'pi pi-file-edit',  to: '/orders',         permission: 'orders.read' },
      { label: 'Stats Pedidos', icon: 'pi pi-chart-line', to: '/orders/stats',   permission: 'orders.read' },
      { label: 'Contactos',     icon: 'pi pi-users',      to: '/contacts',       permission: 'contacts.read' },
    ],
  },
  {
    id: 'almacen',
    label: 'Almacén',
    icon: 'pi pi-warehouse',
    matchPrefixes: ['/warehouses', '/products', '/inventories', '/stock'],
    permissions: ['stock.read', 'products.read', 'stock.read_inventories', 'stock.read_movements'],
    items: [
      { label: 'Almacenes',       icon: 'pi pi-warehouse', to: '/warehouses',     permission: 'stock.read' },
      { label: 'Productos',       icon: 'pi pi-box',       to: '/products',       permission: 'products.read' },
      { label: 'Inventarios',     icon: 'pi pi-clipboard', to: '/inventories',    permission: 'stock.read_inventories' },
      { label: 'Stock a fecha',   icon: 'pi pi-calendar',  to: '/stock/at-date',  permission: 'stock.read_movements' },
    ],
  },
  {
    id: 'admin',
    label: 'Administración',
    icon: 'pi pi-cog',
    matchPrefixes: ['/users'],
    permissions: ['users.read'],
    items: [
      { label: 'Usuarios y grupos', icon: 'pi pi-user', to: '/users', permission: 'users.read' },
    ],
  },
  {
    id: 'superadmin',
    label: 'Super Admin',
    icon: 'pi pi-shield',
    matchPrefixes: ['/admin'],
    superAdminOnly: true,
    items: [
      { label: 'Organizaciones',     icon: 'pi pi-building', to: '/admin/organizaciones' },
      { label: 'Grupos de Permisos', icon: 'pi pi-shield',   to: '/admin/permission-groups' },
    ],
  },
];

/** Reusable link style */
const linkClass = (isActive: boolean) =>
  `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm no-underline transition-all duration-150 ${
    isActive
      ? 'bg-blue-50 text-[#1b3a5f] font-semibold shadow-sm border border-blue-100'
      : 'text-gray-600 hover:bg-gray-100 hover:text-[#1b3a5f]'
  }`;

const iconClass = (icon: string, isActive: boolean) =>
  `${icon} text-sm ${isActive ? 'text-blue-600' : 'text-gray-400'}`;

export function Sidebar() {
  const { hasPermission, isSuperAdmin, user } = useAuth();
  const { isOpen, close } = useSidebar();
  const location = useLocation();

  // Find which section is active based on current route (for desktop)
  const activeSection = navSections.find((section) => {
    if (section.superAdminOnly && !isSuperAdmin) return false;
    return section.matchPrefixes.some((p) => location.pathname.startsWith(p));
  });

  // Filter items by permission for a section
  const getVisibleItems = (section: NavSection) =>
    section.superAdminOnly
      ? section.items
      : section.items.filter((item) => !item.permission || hasPermission(item.permission));

  // All sections visible to the user (for mobile)
  const visibleSections = navSections.filter((s) => {
    if (s.superAdminOnly && !isSuperAdmin) return false;
    if (s.permissions && s.permissions.length > 0 && !s.permissions.some((p) => hasPermission(p))) return false;
    return true;
  });

  // Desktop: items for active section only
  const desktopItems = activeSection ? getVisibleItems(activeSection) : [];

  return (
    <aside className={`
      fixed top-[54px] left-0 bottom-0 w-[210px] bg-white border-r border-gray-200
      overflow-y-auto z-40 flex flex-col shadow-sm
      transition-transform duration-200 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:translate-x-0
    `}>
      {/* ── MOBILE: all sections with level-1 headers + level-2 items ── */}
      <nav className="flex flex-col flex-1 pt-2 pb-2 lg:hidden">
        {/* Dashboard link */}
        <div className="px-2 mb-1">
          <NavLink to="/" end onClick={close} className={({ isActive }) => linkClass(isActive)}>
            {({ isActive }) => (
              <>
                <i className={iconClass('pi pi-chart-bar', isActive)} />
                <span>Mi Tablero</span>
              </>
            )}
          </NavLink>
        </div>

        {visibleSections.map((section) => {
          const items = getVisibleItems(section);
          if (items.length === 0) return null;
          return (
            <div key={section.id} className="mt-2">
              {/* Level 1: section header */}
              <div className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${
                section.superAdminOnly ? 'text-orange-500' : 'text-gray-400'
              }`}>
                <i className={`${section.icon} text-[10px]`} />
                <span>{section.label}</span>
              </div>
              {/* Level 2: section items */}
              <div className="flex flex-col gap-0.5 px-2">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end ?? false}
                    onClick={close}
                    className={({ isActive }) => linkClass(isActive)}
                  >
                    {({ isActive }) => (
                      <>
                        <i className={iconClass(item.icon, isActive)} />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── DESKTOP: only active section items (or dashboard link if none) ── */}
      <nav className="hidden lg:flex flex-col flex-1 pt-2 pb-2">
        {desktopItems.length > 0 ? (
          <div className="flex flex-col gap-0.5 px-2 pt-2">
            {desktopItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end ?? false}
                onClick={close}
                className={({ isActive }) => linkClass(isActive)}
              >
                {({ isActive }) => (
                  <>
                    <i className={iconClass(item.icon, isActive)} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ) : (
          <div className="px-3 pt-4">
            <NavLink to="/" end onClick={close} className={({ isActive }) => linkClass(isActive)}>
              {({ isActive }) => (
                <>
                  <i className={iconClass('pi pi-chart-bar', isActive)} />
                  <span>Mi Tablero</span>
                </>
              )}
            </NavLink>
          </div>
        )}
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
