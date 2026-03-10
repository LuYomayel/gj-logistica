import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import type { DataTablePageEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Skeleton } from 'primereact/skeleton';
import { contactsApi } from '../api/contactsApi';
import { ContactFormDialog } from './ContactFormDialog';
import { useAuth } from '../../../shared/hooks/useAuth';
import type { Contact } from '../../../shared/types';

export function ContactsTable() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editContact, setEditContact] = useState<Contact | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', { page, limit, search }],
    queryFn: () => contactsApi.list({ page, limit, search: search || undefined }),
  });

  const contacts = data?.data ?? [];
  const total = data?.total ?? 0;

  const applySearch = () => { setSearch(searchInput); setPage(1); };
  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const onPage = (e: DataTablePageEvent) => {
    setPage((e.page ?? 0) + 1);
    setLimit(e.rows ?? 20);
  };

  if (isLoading) {
    return <Skeleton height="400px" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <ContactFormDialog
        visible={showCreate || !!editContact}
        onHide={() => { setShowCreate(false); setEditContact(undefined); }}
        contact={editContact}
        onSaved={(id) => {
          if (!editContact) {
            navigate(`/contacts/${id}`);
          }
          // When editing from table, just close dialog — TanStack Query auto-refreshes
        }}
      />

      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1b3a5f]">Contactos</h1>
          <p className="text-gray-500 text-sm">{total.toLocaleString('es-AR')} contactos en total</p>
        </div>
        <div className="flex gap-2">
          {hasPermission('contacts.write') && (
            <Button
              label="Nuevo Contacto"
              icon="pi pi-plus"
              onClick={() => setShowCreate(true)}
              className="bg-[#1b3a5f] text-white border-[#1b3a5f] px-4 py-2"
            />
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[220px]">
            <label className="text-xs font-medium text-gray-600">Buscar</label>
            <InputText
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Nombre, apellido, email..."
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              className="text-sm"
            />
          </div>
          <Button
            label="Buscar"
            icon="pi pi-search"
            onClick={applySearch}
            className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700 px-4 py-2"
          />
          <Button
            label="Limpiar"
            icon="pi pi-times"
            onClick={clearSearch}
            outlined
            severity="secondary"
            className="px-4 py-2"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <DataTable
          value={contacts}
          lazy
          paginator
          scrollable
          rows={limit}
          totalRecords={total}
          first={(page - 1) * limit}
          onPage={onPage}
          rowsPerPageOptions={[10, 20, 50]}
          size="small"
          emptyMessage="No se encontraron contactos"
          rowClassName={() => 'cursor-pointer hover:bg-blue-50 transition-colors'}
          onRowClick={(e) => navigate(`/contacts/${(e.data as Contact).id}`)}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        >
          <Column
            field="lastName"
            header="Apellido"
            style={{ width: '130px' }}
            body={(row: Contact) => row.lastName ?? '-'}
          />
          <Column
            field="firstName"
            header="Nombre"
            style={{ width: '130px' }}
            body={(row: Contact) => row.firstName ?? '-'}
          />
          <Column
            field="email"
            header="Correo"
            body={(row: Contact) =>
              row.email ? (
                <a href={`mailto:${row.email}`} className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                  {row.email}
                </a>
              ) : (
                '-'
              )
            }
          />
          <Column
            field="phonePro"
            header="Teléfono"
            style={{ width: '130px' }}
            body={(row: Contact) => row.phonePro ?? '-'}
          />
          <Column
            field="thirdParty.name"
            header="Tercero"
            style={{ width: '150px' }}
            body={(row: Contact) => row.thirdParty?.name ?? '-'}
          />
          <Column
            field="marca"
            header="Marca"
            style={{ width: '120px' }}
            body={(row: Contact) => row.marca ?? '-'}
          />
          <Column
            field="dni"
            header="DNI"
            style={{ width: '100px' }}
            body={(row: Contact) => row.dni ?? '-'}
          />
          <Column
            field="nombreFantasia"
            header="Nombre Fantasía"
            style={{ width: '150px' }}
            body={(row: Contact) => row.nombreFantasia ?? '-'}
          />
          <Column
            field="lugarDeEntrega"
            header="Lugar entrega"
            style={{ width: '130px' }}
            body={(row: Contact) => row.lugarDeEntrega ?? '-'}
          />
          {hasPermission('contacts.write') && (
            <Column
              header=""
              style={{ width: '50px' }}
              body={(row: Contact) => (
                <Button
                  icon="pi pi-pencil"
                  text
                  severity="secondary"
                  className="p-1"
                  onClick={(e) => { e.stopPropagation(); setEditContact(row); }}
                  tooltip="Editar"
                />
              )}
            />
          )}
        </DataTable>
      </div>
    </div>
  );
}
