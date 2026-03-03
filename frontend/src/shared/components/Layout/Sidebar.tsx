import { NavLink } from 'react-router-dom';

interface NavItem { label: string; icon: string; to: string; end?: boolean; }

interface NavSection { section: string; items: NavItem[] }

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
      { label: 'Pedidos',           icon: 'pi pi-file-edit',  to: '/orders' },
      { label: 'Stats Pedidos',     icon: 'pi pi-chart-line', to: '/orders/stats' },
      { label: 'Contactos',         icon: 'pi pi-users',      to: '/contacts' },
    ],
  },
  {
    section: 'Almacén',
    items: [
      { label: 'Almacenes',         icon: 'pi pi-warehouse',  to: '/warehouses' },
      { label: 'Productos',         icon: 'pi pi-box',        to: '/products' },
      { label: 'Stats Productos',   icon: 'pi pi-chart-pie',  to: '/products/stats' },
      { label: 'Inventarios',       icon: 'pi pi-clipboard',  to: '/inventories' },
      { label: 'Stock a fecha',     icon: 'pi pi-calendar',   to: '/stock/at-date' },
    ],
  },
  {
    section: 'Administración',
    items: [
      { label: 'Usuarios y grupos', icon: 'pi pi-user', to: '/users' },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="fixed top-[54px] left-0 bottom-0 w-[210px] bg-white border-r border-gray-200 overflow-y-auto z-40 flex flex-col shadow-sm">
      <nav className="flex flex-col flex-1 pt-2 pb-2">
        {navSections.map((section) => (
          <div key={section.section} className="mb-2">
            <div className="px-4 pt-3 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {section.section}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 px-2">
              {section.items.map((item) => (
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
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <p className="text-[10px] text-gray-300 text-center">GJ Logística v1.0</p>
      </div>
    </aside>
  );
}
