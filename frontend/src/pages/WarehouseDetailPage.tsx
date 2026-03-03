import { useParams } from 'react-router-dom';
import { WarehouseDetail } from '../features/warehouses/components/WarehouseDetail';

export default function WarehouseDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <WarehouseDetail id={Number(id)} />;
}
