import { useParams, Navigate } from 'react-router-dom';
import { ContactDetail } from '../features/contacts/components/ContactDetail';

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const contactId = Number(id);

  if (!id || isNaN(contactId)) {
    return <Navigate to="/contacts" replace />;
  }

  return <ContactDetail id={contactId} />;
}
