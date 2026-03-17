import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AccessDenied } from './AccessDenied';

/** Only allows super_admin users. Shows "Access Denied" for others. */
export function AdminRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.userType !== 'super_admin') {
    return <AccessDenied message="Esta sección es exclusiva para Super Administradores." />;
  }
  return <Outlet />;
}
