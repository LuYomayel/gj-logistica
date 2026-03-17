import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from 'primereact/button';
import { useAuth } from '../../hooks/useAuth';
import { useSidebar } from './AppLayout';

interface TopNavSection {
  label: string;
  icon: string;
  /** Base path — clicking navigates here */
  to: string;
  /** Route prefixes that make this section "active" */
  matchPrefixes: string[];
  /** Section is visible if the user has ANY of these permissions */
  permissions?: string[];
  superAdminOnly?: boolean;
}

const SECTIONS: TopNavSection[] = [
  {
    label: 'Inicio',
    icon: 'pi pi-home',
    to: '/',
    matchPrefixes: ['/'],
  },
  {
    label: 'Comercial',
    icon: 'pi pi-briefcase',
    to: '/orders',
    matchPrefixes: ['/orders', '/third-parties', '/contacts'],
    permissions: ['orders.read', 'third_parties.read', 'contacts.read'],
  },
  {
    label: 'Almacén',
    icon: 'pi pi-warehouse',
    to: '/warehouses',
    matchPrefixes: ['/warehouses', '/products', '/inventories', '/stock'],
    permissions: ['stock.read', 'products.read', 'stock.read_inventories', 'stock.read_movements'],
  },
  {
    label: 'Administración',
    icon: 'pi pi-cog',
    to: '/users',
    matchPrefixes: ['/users'],
    permissions: ['users.read'],
  },
  {
    label: 'Super Admin',
    icon: 'pi pi-shield',
    to: '/admin/organizaciones',
    matchPrefixes: ['/admin'],
    superAdminOnly: true,
  },
];

export function TopBar() {
  const { user, logout, hasPermission, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toggle } = useSidebar();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (section: TopNavSection) => {
    if (section.to === '/' && location.pathname === '/') return true;
    if (section.to === '/') return false;
    return section.matchPrefixes.some((p) => location.pathname.startsWith(p));
  };

  const visibleSections = SECTIONS.filter((s) => {
    if (s.superAdminOnly && !isSuperAdmin) return false;
    // Show section if user has ANY of the listed permissions
    if (s.permissions && s.permissions.length > 0 && !s.permissions.some((p) => hasPermission(p))) return false;
    return true;
  });

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center gap-2 lg:gap-4 px-3 lg:px-4 h-[54px] bg-[#1b3a5f] text-white shadow-md">
      {/* Hamburger — mobile only */}
      <button
        onClick={toggle}
        className="lg:hidden flex items-center justify-center w-9 h-9 rounded hover:bg-white/10 transition-colors shrink-0"
        aria-label="Abrir menú"
      >
        <i className="pi pi-bars text-lg" />
      </button>

      {/* Logo */}
      <Link
        to="/"
        className="flex items-center gap-2 text-white font-bold text-lg no-underline whitespace-nowrap tracking-wide shrink-0"
      >
        <i className="pi pi-box text-xl text-blue-300" />
        <span className="hidden sm:inline">GJ Logística</span>
      </Link>

      {/* Separator — desktop only */}
      <div className="w-px h-6 bg-white/20 shrink-0 hidden lg:block" />

      {/* Top nav — desktop only, section-level navigation */}
      <nav className="hidden lg:flex items-center gap-0.5 text-sm">
        {visibleSections.map((section) => {
          const active = isActive(section);
          return (
            <Link
              key={section.to}
              to={section.to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded no-underline transition-colors ${
                active
                  ? 'bg-white/20 text-white font-semibold'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              } ${section.superAdminOnly ? 'text-orange-300 hover:text-orange-200' : ''}`}
            >
              <i className={`${section.icon} text-xs`} />
              <span>{section.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right: user info + logout */}
      <div className="ml-auto flex items-center gap-2 text-sm text-white/90 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
          <i className="pi pi-user text-sm" />
          <span className="font-medium">{user?.firstName ?? user?.username}</span>
        </div>
        <Button
          icon="pi pi-sign-out"
          rounded
          text
          className="!text-white/80 hover:!text-white hover:!bg-white/10 !p-2"
          tooltip="Cerrar sesión"
          tooltipOptions={{ position: 'bottom' }}
          onClick={handleLogout}
        />
      </div>
    </header>
  );
}
