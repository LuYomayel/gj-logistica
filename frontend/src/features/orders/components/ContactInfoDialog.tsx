import { Dialog } from 'primereact/dialog';
import type { Contact } from '../../../shared/types';

interface Props {
  contact: Contact | null;
  visible: boolean;
  onHide: () => void;
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex flex-col sm:flex-row border-b border-gray-100 py-2">
      <span className="sm:w-[160px] sm:shrink-0 text-sm font-medium text-gray-500">{label}</span>
      <span className="text-sm text-gray-800">{value ?? '-'}</span>
    </div>
  );
}

export function ContactInfoDialog({ contact, visible, onHide }: Props) {
  if (!contact) return null;

  const fullName = `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || '-';
  const fullAddress = [contact.address, contact.city, contact.postalCode]
    .filter(Boolean)
    .join(', ') || '-';

  return (
    <Dialog
      header="Datos del Contacto"
      visible={visible}
      onHide={onHide}
      style={{ width: '450px' }}
      breakpoints={{ '768px': '95vw' }}
      modal
      draggable={false}
    >
      <div className="p-2">
        <InfoRow label="Nombre" value={fullName} />
        <InfoRow label="Nombre fantasía" value={contact.nombreFantasia} />
        <InfoRow label="DNI" value={contact.dni} />
        <InfoRow label="Tel. profesional" value={contact.phonePro} />
        <InfoRow label="Tel. móvil" value={contact.phoneMobile} />
        <InfoRow label="Email" value={contact.email} />
        <InfoRow label="Dirección" value={fullAddress} />
        <InfoRow label="Lugar de entrega" value={contact.lugarDeEntrega} />
        <InfoRow label="Marca" value={contact.marca} />
      </div>
    </Dialog>
  );
}
