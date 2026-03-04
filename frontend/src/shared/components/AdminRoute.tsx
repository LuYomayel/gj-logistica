import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/** Only allows super_admin users. Redirects others to home. */
export function AdminRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.userType !== 'super_admin') return <Navigate to="/" replace />;
  return <Outlet />;
}
