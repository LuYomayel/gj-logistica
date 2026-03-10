import { Link, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { useAuth } from '../../hooks/useAuth';
import { useSidebar } from './AppLayout';

interface TopNavItem {
  label: string;
  to: string;
  permission?: string;
}

const TOP_NAV: TopNavItem[] = [
  { label: 'Inicio', to: '/' },
  { label: 'Terceros', to: '/contacts', permission: 'contacts.read' },
  { label: 'Productos', to: '/products', permission: 'products.read' },
  { label: 'Pedidos', to: '/orders', permission: 'orders.read' },
  { label: 'Usuarios', to: '/users', permission: 'users.read' },
];

export function TopBar() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { toggle } = useSidebar();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center gap-2 lg:gap-6 px-3 lg:px-4 h-[54px] bg-[#1b3a5f] text-white shadow-md">
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

      {/* Top nav — desktop only, filtered by permission */}
      <nav className="hidden lg:flex items-center gap-0.5 text-sm">
        {TOP_NAV.filter((item) =>
          !item.permission ? true : hasPermission(item.permission),
        ).map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="px-3 py-1.5 rounded text-white/80 hover:bg-white/10 hover:text-white no-underline transition-colors"
          >
            {item.label}
          </Link>
        ))}
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
