import { Link, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { useAuth } from '../../hooks/useAuth';

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center gap-6 px-4 h-[54px] bg-[#1b3a5f] text-white shadow-md">
      {/* Logo */}
      <Link
        to="/"
        className="flex items-center gap-2 text-white font-bold text-lg no-underline whitespace-nowrap tracking-wide shrink-0"
      >
        <i className="pi pi-box text-xl text-blue-300" />
        GJ Logística
      </Link>

      {/* Separator */}
      <div className="w-px h-6 bg-white/20 shrink-0" />

      {/* Top nav */}
      <nav className="flex items-center gap-0.5 text-sm">
        <Link
          to="/"
          className="px-3 py-1.5 rounded text-white/80 hover:bg-white/10 hover:text-white no-underline transition-colors"
        >
          Inicio
        </Link>
        <Link
          to="/contacts"
          className="px-3 py-1.5 rounded text-white/80 hover:bg-white/10 hover:text-white no-underline transition-colors"
        >
          Terceros
        </Link>
        <Link
          to="/products"
          className="px-3 py-1.5 rounded text-white/80 hover:bg-white/10 hover:text-white no-underline transition-colors"
        >
          Productos
        </Link>
        <Link
          to="/orders"
          className="px-3 py-1.5 rounded text-white/80 hover:bg-white/10 hover:text-white no-underline transition-colors"
        >
          Comercio
        </Link>
        <Link
          to="/users"
          className="px-3 py-1.5 rounded text-white/80 hover:bg-white/10 hover:text-white no-underline transition-colors"
        >
          Utilidades
        </Link>
      </nav>

      {/* Right: user + logout */}
      <div className="ml-auto flex items-center gap-2 text-sm text-white/90 shrink-0">
        <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
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
