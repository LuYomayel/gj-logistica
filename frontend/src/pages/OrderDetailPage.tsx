import { useParams, Navigate } from 'react-router-dom';
import { OrderDetail } from '../features/orders/components/OrderDetail';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);

  if (!id || isNaN(orderId)) {
    return <Navigate to="/orders" replace />;
  }

  return <OrderDetail id={orderId} />;
}
