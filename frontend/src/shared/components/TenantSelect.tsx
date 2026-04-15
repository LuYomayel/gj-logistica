import { Dropdown } from 'primereact/dropdown';
import { useTenants } from '../hooks/useTenants';

interface TenantSelectProps {
  value: number | null | undefined;
  onChange: (tenantId: number | null) => void;
  placeholder?: string;
  required?: boolean;
  allowNull?: boolean;
  nullLabel?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Dropdown de organizaciones visible para super_admin.
 * Si el usuario no es super_admin no renderiza nada (el backend tomará user.tenantId).
 */
export function TenantSelect({
  value,
  onChange,
  placeholder = 'Seleccionar organización',
  allowNull = false,
  nullLabel = 'Todas',
  className,
  disabled,
}: TenantSelectProps) {
  const { data: tenants, isLoading } = useTenants();

  if (!tenants) return null;

  const options = [
    ...(allowNull ? [{ label: nullLabel, value: null as number | null }] : []),
    ...tenants.map((t) => ({ label: t.name, value: t.id })),
  ];

  return (
    <Dropdown
      value={value ?? null}
      options={options}
      onChange={(e) => onChange(e.value ?? null)}
      placeholder={placeholder}
      filter
      showClear={allowNull}
      disabled={disabled || isLoading}
      className={className}
    />
  );
}
