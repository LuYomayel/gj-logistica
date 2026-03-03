import { useParams, Navigate } from 'react-router-dom';
import { ProductDetail } from '../features/products/components/ProductDetail';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);

  if (!id || isNaN(productId)) {
    return <Navigate to="/products" replace />;
  }

  return <ProductDetail id={productId} />;
}
