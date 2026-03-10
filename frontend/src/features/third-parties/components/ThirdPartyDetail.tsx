import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { TabView, TabPanel } from 'primereact/tabview';
import { Button } from 'primereact/button';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { thirdPartiesApi } from '../api/thirdPartiesApi';
import { contactsApi } from '../../contacts/api/contactsApi';
import { ThirdPartyFormDialog } from './ThirdPartyFormDialog';
import { useAuth } from '../../../shared/hooks/useAuth';
import type { ThirdParty, Contact } from '../../../shared/types';

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

export function ThirdPartyDetail({ id }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [showEdit, setShowEdit] = useState(false);

  const { data: thirdParty, isLoading } = useQuery<ThirdParty>({
    queryKey: ['third-parties', id],
    queryFn: () => thirdPartiesApi.get(id),
  });

  // Load contacts filtered by thirdPartyId (server-side)
  const { data: contactsData } = useQuery({
    queryKey: ['contacts', { thirdPartyId: id }],
    queryFn: () => contactsApi.list({ thirdPartyId: id, limit: 200 }),
    enabled: !!thirdParty,
  });

  const contacts = contactsData?.data ?? [];

  const deactivateMut = useMutation({
    mutationFn: () => thirdPartiesApi.update(id, { name: thirdParty!.name, status: 0 }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['third-parties', id] });
      void queryClient.invalidateQueries({ queryKey: ['third-parties'] });
    },
  });

  const handleDeactivate = () => {
    confirmDialog({
      message: `¿Desactivar el tercero "${thirdParty?.name}"?`,
      header: 'Confirmar desactivación',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'bg-red-600 text-white border-red-600',
      acceptLabel: 'Desactivar',
      rejectLabel: 'Cancelar',
      accept: () => {
        deactivateMut.mutate();
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton height="60px" />
        <Skeleton height="400px" />
      </div>
    );
  }

  if (!thirdParty) {
    return (
      <div className="text-center py-20 text-gray-500">
        <i className="pi pi-inbox text-5xl mb-4 block" />
        Tercero no encontrado
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ConfirmDialog />

      <ThirdPartyFormDialog
        visible={showEdit}
        onHide={() => setShowEdit(false)}
        thirdParty={thirdParty}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ['third-parties', id] });
        }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Button
              icon="pi pi-arrow-left"
              text
              onClick={() => navigate('/third-parties')}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2"
            />
            <h1 className="text-xl font-bold text-[#1b3a5f]">
              {thirdParty.name}
            </h1>
          </div>
          <div className="flex gap-2 ml-8">
            {thirdParty.clientCode && (
              <Tag value={thirdParty.clientCode} severity="secondary" icon="pi pi-id-card" />
            )}
            <Tag
              value={thirdParty.status === 1 ? 'Activo' : 'Inactivo'}
              severity={thirdParty.status === 1 ? 'success' : 'danger'}
            />
            {thirdParty.isClient === 1 && (
              <Tag value="Cliente" severity="info" />
            )}
            {thirdParty.isSupplier === 1 && (
              <Tag value="Proveedor" severity="warning" />
            )}
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {hasPermission('third_parties.write') && (
            <Button
              label="Editar"
              icon="pi pi-pencil"
              outlined
              className="px-4 py-2"
              onClick={() => setShowEdit(true)}
            />
          )}
          {hasPermission('third_parties.write') && thirdParty.status === 1 && (
            <Button
              label="Desactivar"
              icon="pi pi-ban"
              outlined
              severity="danger"
              className="px-4 py-2"
              onClick={handleDeactivate}
              loading={deactivateMut.isPending}
            />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <TabView>
          {/* Tab: Información */}
          <TabPanel header="Información">
            <div className="p-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Datos principales
                  </h3>
                  <InfoRow label="Nombre" value={thirdParty.name} />
                  <InfoRow label="Código cliente" value={thirdParty.clientCode} />
                  <InfoRow label="CUIT" value={thirdParty.taxId} />
                  <InfoRow label="Email" value={thirdParty.email} />
                  <InfoRow label="Teléfono" value={thirdParty.phone} />
                  <InfoRow label="Website" value={thirdParty.website} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Dirección
                  </h3>
                  <InfoRow label="Dirección" value={thirdParty.address} />
                  <InfoRow label="Ciudad" value={thirdParty.city} />
                  <InfoRow label="Código postal" value={thirdParty.postalCode} />
                  <InfoRow
                    label="Creado"
                    value={new Date(thirdParty.createdAt).toLocaleDateString('es-AR')}
                  />
                </div>
              </div>

              {thirdParty.notes && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Notas
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{thirdParty.notes}</p>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Tab: Contactos */}
          <TabPanel header={`Contactos (${contacts.length})`}>
            <div className="p-2">
              {contacts.length === 0 ? (
                <p className="text-gray-500 text-sm italic py-4">
                  No hay contactos asociados a este tercero.
                </p>
              ) : (
                <DataTable
                  value={contacts}
                  size="small"
                  emptyMessage="Sin contactos"
                  rowClassName={() => 'cursor-pointer hover:bg-blue-50 transition-colors'}
                  onRowClick={(e) => navigate(`/contacts/${(e.data as Contact).id}`)}
                >
                  <Column
                    header="Nombre"
                    body={(c: Contact) =>
                      `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || '-'
                    }
                  />
                  <Column field="email" header="Email" />
                  <Column field="phonePro" header="Teléfono" />
                  <Column field="marca" header="Marca" />
                  <Column field="city" header="Ciudad" />
                </DataTable>
              )}
            </div>
          </TabPanel>
        </TabView>
      </div>
    </div>
  );
}
