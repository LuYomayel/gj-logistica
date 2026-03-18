import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AutoComplete } from 'primereact/autocomplete';
import type { AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { Button } from 'primereact/button';
import { ordersApi } from '../api/ordersApi';
import { contactsApi } from '../../contacts/api/contactsApi';
import type { Contact } from '../../../shared/types';

interface Props {
  orderId: number;
  isDraft: boolean;
  canWrite: boolean;
}

export function OrderContactsPanel({ orderId, isDraft, canWrite }: Props) {
  const queryClient = useQueryClient();
  const [contactInput, setContactInput] = useState<string | Contact>('');
  const [suggestions, setSuggestions] = useState<Contact[]>([]);

  const { data: contacts = [] } = useQuery({
    queryKey: ['order-contacts', orderId],
    queryFn: () => ordersApi.getContacts(orderId),
  });

  const assignMut = useMutation({
    mutationFn: (contactId: number) => ordersApi.assignContact(orderId, contactId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['order-contacts', orderId] });
      setContactInput('');
    },
  });

  const removeMut = useMutation({
    mutationFn: (contactId: number) => ordersApi.removeContact(orderId, contactId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['order-contacts', orderId] });
    },
  });

  const searchContacts = async (event: AutoCompleteCompleteEvent) => {
    const query = event.query.trim();
    if (query.length < 1) { setSuggestions([]); return; }
    try {
      const result = await contactsApi.list({ search: query, limit: 20 });
      setSuggestions(result.data);
    } catch {
      setSuggestions([]);
    }
  };

  const selectedContact: Contact | null =
    contactInput !== '' && typeof contactInput !== 'string' ? (contactInput as Contact) : null;

  const handleAssign = () => {
    if (!selectedContact) return;
    assignMut.mutate(selectedContact.id);
  };

  const contactName = (c: Contact) =>
    `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.alias || '-';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Contacto del pedido
      </h3>

      {contacts.length === 0 && (
        <p className="text-sm text-gray-400 italic mb-3">Sin contacto asignado</p>
      )}

      {contacts.map((oc) => (
        <div key={oc.id} className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-b-0">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-800">
              {oc.contact ? contactName(oc.contact) : `Contacto #${oc.contactId}`}
            </span>
            <span className="text-xs text-gray-500">
              {oc.contact?.phonePro || oc.contact?.phoneMobile || ''}
              {oc.contact?.email ? ` · ${oc.contact.email}` : ''}
            </span>
            {oc.contact?.address && (
              <span className="text-xs text-gray-400">
                {oc.contact.address}{oc.contact.city ? `, ${oc.contact.city}` : ''}
              </span>
            )}
          </div>
          {isDraft && canWrite && (
            <Button
              icon="pi pi-trash"
              text
              severity="danger"
              size="small"
              loading={removeMut.isPending}
              onClick={() => removeMut.mutate(oc.contactId)}
              className="p-1"
            />
          )}
        </div>
      ))}

      {isDraft && canWrite && (
        <div className="flex items-end gap-2 mt-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Agregar contacto</label>
            <AutoComplete
              value={contactInput}
              field="firstName"
              suggestions={suggestions}
              completeMethod={searchContacts}
              itemTemplate={(c: Contact) => (
                <div className="flex items-center gap-2 py-1">
                  <span className="text-sm">{contactName(c)}</span>
                  {c.dni && <span className="text-xs text-gray-400">DNI: {c.dni}</span>}
                </div>
              )}
              selectedItemTemplate={(c: Contact) => contactName(c)}
              onChange={(e) => setContactInput(e.value as string | Contact)}
              placeholder="Buscar por nombre..."
              minLength={1}
              delay={200}
              className="w-full text-sm"
              inputClassName="w-full text-sm"
            />
          </div>
          <Button
            icon="pi pi-plus"
            label="Asignar"
            loading={assignMut.isPending}
            disabled={!selectedContact}
            onClick={handleAssign}
            className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700 px-3 py-2 text-sm"
          />
        </div>
      )}
    </div>
  );
}
