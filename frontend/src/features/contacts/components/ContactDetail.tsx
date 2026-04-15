import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { contactsApi } from '../api/contactsApi';
import { ContactFormDialog } from './ContactFormDialog';
import { useAuth } from '../../../shared/hooks/useAuth';
import type { Contact } from '../../../shared/types';

interface InfoRowProps {
  label: string;
  value: string | number | null | undefined;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex border-b border-gray-100 py-2">
      <span className="w-[200px] shrink-0 text-sm font-medium text-gray-500">{label}</span>
      <span className="text-sm text-gray-800">{value ?? '-'}</span>
    </div>
  );
}

interface Props {
  id: number;
}

export function ContactDetail({ id }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [showEdit, setShowEdit] = useState(false);

  const { data: contact, isLoading } = useQuery<Contact>({
    queryKey: ['contacts', id],
    queryFn: () => contactsApi.get(id),
  });

  const deleteMut = useMutation({
    mutationFn: () => contactsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['contacts'] });
      navigate('/contacts');
    },
  });

  const handleDelete = () => {
    confirmDialog({
      message: `¿Desactivar el contacto "${contact?.firstName} ${contact?.lastName}"?`,
      header: 'Confirmar desactivación',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'bg-red-600 text-white border-red-600',
      acceptLabel: 'Desactivar',
      rejectLabel: 'Cancelar',
      accept: () => deleteMut.mutate(),
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton height="60px" />
        <Skeleton height="300px" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center py-20 text-gray-500">
        <i className="pi pi-inbox text-5xl mb-4 block" />
        Contacto no encontrado
      </div>
    );
  }

  const fullName = `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || 'Sin nombre';

  return (
    <div className="flex flex-col gap-4">
      <ConfirmDialog />

      <ContactFormDialog
        visible={showEdit}
        onHide={() => setShowEdit(false)}
        contact={contact}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ['contacts', id] });
        }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Button
              icon="pi pi-arrow-left"
              text
              onClick={() => navigate('/contacts')}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2"
            />
            <h1 className="text-xl font-bold text-[#1b3a5f]">{fullName}</h1>
          </div>
          <div className="flex gap-2 ml-8">
            <Tag
              value={contact.status === 1 ? 'Activo' : 'Inactivo'}
              severity={contact.status === 1 ? 'success' : 'danger'}
            />
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {hasPermission('contacts.write') && (
            <Button
              label="Editar"
              icon="pi pi-pencil"
              outlined
              className="px-4 py-2"
              onClick={() => setShowEdit(true)}
            />
          )}
          {hasPermission('contacts.delete') && (
            <Button
              label="Desactivar"
              icon="pi pi-ban"
              outlined
              severity="danger"
              className="px-4 py-2"
              onClick={handleDelete}
              loading={deleteMut.isPending}
            />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Datos personales
            </h3>
            <InfoRow label="Nombre" value={contact.firstName} />
            <InfoRow label="Apellido" value={contact.lastName} />
            <InfoRow label="DNI" value={contact.dni} />
            <InfoRow label="Nombre fantasía" value={contact.nombreFantasia} />
            <InfoRow label="Alias" value={contact.alias} />
            <InfoRow label="Marca" value={contact.marca} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Contacto y dirección
            </h3>
            <InfoRow label="Email" value={contact.email} />
            <InfoRow label="Teléfono trabajo" value={contact.phonePro} />
            <InfoRow label="Celular" value={contact.phoneMobile} />
            <InfoRow label="Dirección" value={contact.address} />
            <InfoRow label="Ciudad" value={contact.city} />
            <InfoRow label="Código postal" value={contact.postalCode} />
            <InfoRow label="Lugar de entrega" value={contact.lugarDeEntrega} />
          </div>
        </div>
      </div>
    </div>
  );
}
