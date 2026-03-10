import { useParams, Navigate } from 'react-router-dom';
import { ThirdPartyDetail } from '../features/third-parties/components/ThirdPartyDetail';

export default function ThirdPartyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const thirdPartyId = Number(id);

  if (!id || isNaN(thirdPartyId)) {
    return <Navigate to="/third-parties" replace />;
  }

  return <ThirdPartyDetail id={thirdPartyId} />;
}
