import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import type { DataTablePageEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Skeleton } from 'primereact/skeleton';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import { TenantSelect } from '../../../shared/components/TenantSelect';
import { contactsApi } from '../api/contactsApi';
import { ContactFormDialog } from './ContactFormDialog';
import { useAuth } from '../../../shared/hooks/useAuth';
import { canManageTenants } from '../../../shared/hooks/useTenants';
import type { Contact } from '../../../shared/types';

export function ContactsTable() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, user } = useAuth();
  const isSuperAdmin = canManageTenants(user?.userType);
  const toast = useRef<Toast>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editContact, setEditContact] = useState<Contact | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', { page, limit, search, tenantFilter }],
    queryFn: () =>
      contactsApi.list({
        page,
        limit,
        search: search || undefined,
        tenantId: isSuperAdmin && tenantFilter ? tenantFilter : undefined,
      }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => contactsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.current?.show({ severity: 'success', summary: 'Contacto eliminado', life: 3000 });
    },
    onError: () => {
      toast.current?.show({ severity: 'error', summary: 'Error al eliminar el contacto', life: 4000 });
    },
  });

  const deactivateMut = useMutation({
    mutationFn: (id: number) => contactsApi.deactivate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.current?.show({ severity: 'success', summary: 'Contacto desactivado', life: 3000 });
    },
    onError: () => {
      toast.current?.show({ severity: 'error', summary: 'Error al desactivar el contacto', life: 4000 });
    },
  });

  const activateMut = useMutation({
    mutationFn: (id: number) => contactsApi.activate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.current?.show({ severity: 'success', summary: 'Contacto reactivado', life: 3000 });
    },
    onError: () => {
      toast.current?.show({ severity: 'error', summary: 'Error al reactivar el contacto', life: 4000 });
    },
  });

  const handleDelete = (row: Contact) => {
    confirmDialog({
      message: `¿Eliminar permanentemente el contacto ${row.firstName ?? ''} ${row.lastName ?? ''}? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: () => deleteMut.mutate(row.id),
    });
  };

  const handleDeactivate = (row: Contact) => {
    confirmDialog({
      message: `¿Desactivar el contacto ${row.firstName ?? ''} ${row.lastName ?? ''}? Se marcará como inactivo pero no se eliminará.`,
      header: 'Confirmar desactivación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Desactivar',
      rejectLabel: 'Cancelar',
      accept: () => deactivateMut.mutate(row.id),
    });
  };

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
      <Toast ref={toast} />
      <ConfirmDialog />
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
          {isSuperAdmin && (
            <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[220px]">
              <label className="text-xs font-medium text-gray-600">Organización</label>
              <TenantSelect
                value={tenantFilter}
                onChange={(id) => { setTenantFilter(id); setPage(1); }}
                placeholder="Todas"
                allowNull
                nullLabel="Todas las organizaciones"
              />
            </div>
          )}
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
            style={{ width: '160px' }}
            body={(row: Contact) => (
              <div className="flex items-center gap-2">
                <span>{row.lastName ?? '-'}</span>
                {row.status === 0 && (
                  <Tag value="Inactivo" severity="danger" className="text-[10px]" />
                )}
              </div>
            )}
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
          {isSuperAdmin && (
            <Column
              field="tenant.name"
              header="Organización"
              style={{ width: '140px' }}
              body={(row: Contact) => row.tenant?.name ?? `#${row.entity ?? '-'}`}
            />
          )}
          {hasPermission('contacts.write') && (
            <Column
              header=""
              style={{ width: '130px' }}
              body={(row: Contact) => (
                <div className="flex gap-1">
                  <Button
                    icon="pi pi-pencil"
                    text
                    severity="secondary"
                    className="p-1"
                    onClick={(e) => { e.stopPropagation(); setEditContact(row); }}
                    tooltip="Editar"
                    tooltipOptions={{ position: 'top' }}
                  />
                  {hasPermission('contacts.delete') && (
                    row.status === 0 ? (
                      <Button
                        icon="pi pi-check-circle"
                        text
                        severity="success"
                        className="p-1"
                        onClick={(e) => { e.stopPropagation(); activateMut.mutate(row.id); }}
                        tooltip="Reactivar"
                        tooltipOptions={{ position: 'top' }}
                      />
                    ) : (
                      <Button
                        icon="pi pi-ban"
                        text
                        severity="warning"
                        className="p-1"
                        onClick={(e) => { e.stopPropagation(); handleDeactivate(row); }}
                        tooltip="Desactivar"
                        tooltipOptions={{ position: 'top' }}
                      />
                    )
                  )}
                  {hasPermission('contacts.delete') && (
                    <Button
                      icon="pi pi-trash"
                      text
                      severity="danger"
                      className="p-1"
                      onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
                      tooltip="Eliminar permanentemente"
                      tooltipOptions={{ position: 'top' }}
                    />
                  )}
                </div>
              )}
            />
          )}
        </DataTable>
      </div>
    </div>
  );
}
