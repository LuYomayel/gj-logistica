import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface NavItem {
  label: string;
  icon: string;
  to: string;
  end?: boolean;
  /** Required permission to display this item. null/undefined = always visible to authenticated users */
  permission?: string | null;
}

interface NavSection {
  section: string;
  items: NavItem[];
  superAdminOnly?: boolean;
}

const navSections: NavSection[] = [
  {
    section: 'Principal',
    items: [
      { label: 'Mi Tablero', icon: 'pi pi-chart-bar', to: '/', end: true },
    ],
  },
  {
    section: 'Comercial',
    items: [
      { label: 'Pedidos',       icon: 'pi pi-file-edit',  to: '/orders',       permission: 'orders.read' },
      { label: 'Stats Pedidos', icon: 'pi pi-chart-line', to: '/orders/stats', permission: 'orders.read' },
      { label: 'Contactos',     icon: 'pi pi-users',      to: '/contacts',     permission: 'contacts.read' },
    ],
  },
  {
    section: 'Almacén',
    items: [
      { label: 'Almacenes',       icon: 'pi pi-warehouse', to: '/warehouses',     permission: 'stock.read' },
      { label: 'Productos',       icon: 'pi pi-box',       to: '/products',       permission: 'products.read' },
      { label: 'Stats Productos', icon: 'pi pi-chart-pie', to: '/products/stats', permission: 'products.read' },
      { label: 'Inventarios',     icon: 'pi pi-clipboard', to: '/inventories',    permission: 'stock.read_inventories' },
      { label: 'Stock a fecha',   icon: 'pi pi-calendar',  to: '/stock/at-date',  permission: 'stock.read_movements' },
    ],
  },
  {
    section: 'Administración',
    items: [
      { label: 'Usuarios y grupos', icon: 'pi pi-user', to: '/users', permission: 'users.read' },
    ],
  },
  {
    section: 'Super Admin',
    superAdminOnly: true,
    items: [
      { label: 'Tenants',            icon: 'pi pi-building', to: '/admin/tenants' },
      { label: 'Grupos de Permisos', icon: 'pi pi-shield',   to: '/admin/permission-groups' },
    ],
  },
];

export function Sidebar() {
  const { user, hasPermission, isSuperAdmin } = useAuth();

  return (
    <aside className="fixed top-[54px] left-0 bottom-0 w-[210px] bg-white border-r border-gray-200 overflow-y-auto z-40 flex flex-col shadow-sm">
      <nav className="flex flex-col flex-1 pt-2 pb-2">
        {navSections.map((section) => {
          // Super admin section: only for super_admin
          if (section.superAdminOnly && !isSuperAdmin) return null;

          // Filter items by permission (super admin section skips individual checks)
          const visibleItems = section.superAdminOnly
            ? section.items
            : section.items.filter((item) =>
                !item.permission ? true : hasPermission(item.permission),
              );

          // Hide entire section if no items are visible
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.section} className="mb-2">
              <div className="px-4 pt-3 pb-1">
                <span className={`text-[10px] font-semibold uppercase tracking-widest ${
                  section.superAdminOnly ? 'text-orange-400' : 'text-gray-400'
                }`}>
                  {section.section}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 px-2">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end ?? false}
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
            </div>
          );
        })}
      </nav>

      {/* Footer with role badge */}
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
    </aside>
  );
}
