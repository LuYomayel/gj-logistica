import { Tag } from 'primereact/tag';
import { ORDER_STATUS } from '../types';

export function StatusBadge({ status }: { status: number }) {
  const info = ORDER_STATUS[status] ?? { label: `Estado ${status}`, severity: 'secondary' as const };
  return <Tag value={info.label} severity={info.severity} className="text-xs" />;
}

// Alias para compatibilidad
export { StatusBadge as OrderStatusBadge };
