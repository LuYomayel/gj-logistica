import { Button } from 'primereact/button';
import { useNavigate } from 'react-router-dom';

interface AccessDeniedProps {
  /** Optional custom message */
  message?: string;
}

/**
 * Full-page "No autorizado" component.
 * Shown when a user tries to access a route they don't have permission for.
 */
export function AccessDenied({ message }: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <i className="pi pi-lock text-6xl text-gray-300" />
      <h1 className="text-2xl font-bold text-[#1b3a5f]">Acceso denegado</h1>
      <p className="text-gray-500 max-w-md">
        {message ?? 'No tenés permisos para acceder a esta sección. Contactá a un administrador si creés que es un error.'}
      </p>
      <Button
        label="Volver al inicio"
        icon="pi pi-arrow-left"
        severity="secondary"
        outlined
        onClick={() => navigate('/')}
      />
    </div>
  );
}
