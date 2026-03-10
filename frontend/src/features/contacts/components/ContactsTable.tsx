import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import type { DataTablePageEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Skeleton } from 'primereact/skeleton';
import { contactsApi } from '../api/contactsApi';
import type { Contact } from '../../../shared/types';

export function ContactsTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', { page, limit, search }],
    queryFn: () => contactsApi.list({ page, limit, search: search || undefined }),
  });

  const contacts = data?.data ?? [];
  const total = data?.total ?? 0;

  const applySearch = () => setSearch(searchInput);
  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
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
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1b3a5f]">Contactos</h1>
        <p className="text-gray-500 text-sm">{total.toLocaleString('es-AR')} contactos en total</p>
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
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        >
          <Column
            field="lastName"
            header="Apellido"
            style={{ width: '150px' }}
            body={(row: Contact) => row.lastName ?? '-'}
          />
          <Column
            field="firstName"
            header="Nombre"
            style={{ width: '150px' }}
            body={(row: Contact) => row.firstName ?? '-'}
          />
          <Column
            field="postalCode"
            header="CP"
            style={{ width: '80px' }}
            body={(row: Contact) => row.postalCode ?? '-'}
          />
          <Column
            field="phonePro"
            header="Teléfono"
            style={{ width: '140px' }}
            body={(row: Contact) => row.phonePro ?? '-'}
          />
          <Column
            field="phoneMobile"
            header="Celular"
            style={{ width: '140px' }}
            body={(row: Contact) => row.phoneMobile ?? '-'}
          />
          <Column
            field="email"
            header="Correo"
            body={(row: Contact) =>
              row.email ? (
                <a href={`mailto:${row.email}`} className="text-blue-600 hover:underline">
                  {row.email}
                </a>
              ) : (
                '-'
              )
            }
          />
          <Column
            field="thirdParty.name"
            header="Tercero"
            style={{ width: '160px' }}
            body={(row: Contact) => row.thirdParty?.name ?? '-'}
          />
          <Column
            field="lugarDeEntrega"
            header="Lugar entrega"
            style={{ width: '140px' }}
            body={(row: Contact) => row.lugarDeEntrega ?? '-'}
          />
        </DataTable>
      </div>
    </div>
  );
}
