import { useRef, useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Dropdown } from 'primereact/dropdown';
import { TabView, TabPanel } from 'primereact/tabview';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Skeleton } from 'primereact/skeleton';
import { Checkbox } from 'primereact/checkbox';
import { permissionsApi } from '../api/permissionsApi';
import { apiErrMsg } from '../../../shared/utils/apiErrMsg';
import type { User, Permission, PermissionGroup } from '../../../shared/types';

/** Map from permission code to human-readable Spanish label */
const PERMISSION_LABELS: Record<string, string> = {
  'users.read': 'Ver usuarios',
  'users.read_permissions': 'Ver permisos de otros usuarios',
  'users.write': 'Crear y modificar usuarios',
  'users.write_external': 'Crear usuarios externos',
  'users.write_password': 'Cambiar contraseña de otros',
  'users.delete': 'Eliminar o desactivar usuarios',
  'users.read_own_perms': 'Ver mis propios permisos',
  'users.write_own_info': 'Modificar mi perfil',
  'users.write_own_password': 'Cambiar mi contraseña',
  'users.write_own_perms': 'Modificar mis propios permisos',
  'users.read_groups': 'Ver grupos',
  'users.read_group_perms': 'Ver permisos de grupos',
  'users.write_groups': 'Crear y modificar grupos',
  'users.delete_groups': 'Eliminar grupos',
  'users.export': 'Exportar usuarios',
  'third_parties.read': 'Ver terceros',
  'third_parties.write': 'Crear y modificar terceros',
  'third_parties.delete': 'Eliminar terceros',
  'third_parties.export': 'Exportar terceros',
  'third_parties.write_payment': 'Gestionar pagos de terceros',
  'third_parties.expand_access': 'Acceder a todos los terceros',
  'contacts.read': 'Ver contactos',
  'contacts.write': 'Crear y modificar contactos',
  'contacts.delete': 'Eliminar contactos',
  'contacts.export': 'Exportar contactos',
  'orders.read': 'Ver pedidos',
  'orders.write': 'Crear y modificar pedidos',
  'orders.validate': 'Validar pedidos',
  'orders.generate_docs': 'Generar documentos de pedidos',
  'orders.send': 'Enviar pedidos',
  'orders.close': 'Cerrar pedidos',
  'orders.cancel': 'Anular pedidos',
  'orders.delete': 'Eliminar pedidos',
  'orders.export': 'Exportar pedidos',
  'products.read': 'Ver productos',
  'products.write': 'Crear y modificar productos',
  'products.read_prices': 'Ver precios de productos',
  'products.delete': 'Eliminar productos',
  'products.export': 'Exportar productos',
  'products.ignore_min_price': 'Ignorar precio mínimo',
  'products.read_position': 'Ver ubicación/posición de productos',
  'stock.read': 'Ver stock',
  'stock.write_warehouses': 'Crear y modificar almacenes',
  'stock.delete_warehouses': 'Eliminar almacenes',
  'stock.read_movements': 'Ver movimientos de stock',
  'stock.write_movements': 'Crear movimientos de stock',
  'stock.read_inventories': 'Ver inventarios',
  'stock.write_inventories': 'Crear y modificar inventarios',
  'barcodes.generate': 'Generar códigos de barras',
  'barcodes.write': 'Crear códigos de barras',
  'barcodes.delete': 'Eliminar códigos de barras',
  'import.run': 'Importar datos masivos',
  'export.run': 'Exportar datos',
};

/** Module display order and Spanish labels */
const MODULE_LABELS: Record<string, string> = {
  orders: 'Pedidos',
  products: 'Productos',
  stock: 'Stock y Almacenes',
  third_parties: 'Terceros',
  contacts: 'Contactos',
  users: 'Usuarios',
  barcodes: 'Códigos de barras',
  import: 'Importación',
  export: 'Exportación',
};

interface Props {
  user: User | null;
  onHide: () => void;
}

export function UserPermissionsPanel({ user, onHide }: Props) {
  const toast = useRef<Toast>(null);
  const qc = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Helper to invalidate all permission-related queries for this user
  const invalidateUserPerms = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['user-permissions', user?.id] }),
      qc.invalidateQueries({ queryKey: ['user-group-memberships', user?.id] }),
    ]);
  }, [qc, user?.id]);

  const { data: effectiveData, isLoading: loadingEffective } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: () => permissionsApi.getUserEffectivePermissions(user!.id),
    enabled: !!user,
  });

  const { data: catalog, isLoading: loadingCatalog } = useQuery({
    queryKey: ['permissions-catalog'],
    queryFn: permissionsApi.getCatalog,
    enabled: !!user,
  });

  const { data: allGroups = [] } = useQuery({
    queryKey: ['permission-groups'],
    queryFn: permissionsApi.listGroups,
    enabled: !!user,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['user-group-memberships', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const results: PermissionGroup[] = [];
      for (const g of allGroups) {
        const groupMembers = await permissionsApi.getGroupMembers(g.id);
        if (groupMembers.some((m) => m.id === user.id)) results.push(g);
      }
      return results;
    },
    enabled: !!user && allGroups.length > 0,
  });

  const addToGroupMutation = useMutation({
    mutationFn: (groupId: number) => permissionsApi.addMemberToGroup(groupId, user!.id),
    onSuccess: async () => {
      await invalidateUserPerms();
      toast.current?.show({ severity: 'success', summary: 'Agregado', detail: 'Usuario agregado al grupo', life: 3000 });
      setSelectedGroupId(null);
    },
    onError: (err) => toast.current?.show({ severity: 'error', summary: 'Error', detail: apiErrMsg(err, 'No se pudo agregar al grupo'), life: 4000 }),
  });

  const removeFromGroupMutation = useMutation({
    mutationFn: (groupId: number) => permissionsApi.removeMemberFromGroup(groupId, user!.id),
    onSuccess: async () => {
      await invalidateUserPerms();
      toast.current?.show({ severity: 'success', summary: 'Quitado', detail: 'Usuario quitado del grupo', life: 3000 });
    },
    onError: (err) => toast.current?.show({ severity: 'error', summary: 'Error', detail: apiErrMsg(err, 'No se pudo quitar del grupo'), life: 4000 }),
  });

  const setPermMutation = useMutation({
    mutationFn: (vars: { permissionId: number; granted: boolean }) =>
      permissionsApi.setUserPermission(user!.id, vars),
    onSuccess: async () => {
      await invalidateUserPerms();
    },
    onError: (err) => toast.current?.show({ severity: 'error', summary: 'Error', detail: apiErrMsg(err, 'No se pudo actualizar el permiso'), life: 4000 }),
  });

  const removePermMutation = useMutation({
    mutationFn: (permissionId: number) => permissionsApi.removeUserPermission(user!.id, permissionId),
    onSuccess: async () => {
      await invalidateUserPerms();
    },
    onError: (err) => toast.current?.show({ severity: 'error', summary: 'Error', detail: apiErrMsg(err, 'No se pudo eliminar el override'), life: 4000 }),
  });

  /** Grant or remove all permissions in a module at once */
  const handleBulkToggleModule = useCallback(async (permissions: Permission[], grant: boolean) => {
    if (!user) return;
    setBulkLoading(true);
    try {
      for (const perm of permissions) {
        if (grant) {
          await permissionsApi.setUserPermission(user.id, { permissionId: perm.id, granted: true });
        } else {
          // Remove the override — if it was granted individually, this clears it
          try {
            await permissionsApi.removeUserPermission(user.id, perm.id);
          } catch {
            // If there's no override to remove, ignore the error
          }
        }
      }
      await invalidateUserPerms();
      toast.current?.show({
        severity: 'success',
        summary: grant ? 'Sección otorgada' : 'Sección quitada',
        detail: `Se actualizaron ${permissions.length} permisos`,
        life: 3000,
      });
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: apiErrMsg(err, 'Error al actualizar permisos en lote'), life: 4000 });
    } finally {
      setBulkLoading(false);
    }
  }, [user, invalidateUserPerms]);

  const handleRemoveFromGroup = (group: PermissionGroup) => {
    confirmDialog({
      message: `¿Quitar a ${user?.username} del grupo "${group.name}"?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: () => removeFromGroupMutation.mutate(group.id),
    });
  };

  const availableGroups = allGroups.filter((g) => !members.some((m) => m.id === g.id));

  // Build override map: permissionId → granted boolean
  const overrideMap = useMemo(() => {
    const map = new Map<number, boolean>();
    for (const o of effectiveData?.overrides ?? []) {
      map.set(o.permissionId, o.granted);
    }
    return map;
  }, [effectiveData?.overrides]);

  // Build effective set for quick lookup
  const effectiveSet = useMemo(
    () => new Set(effectiveData?.effective ?? []),
    [effectiveData?.effective],
  );

  const isAnyMutating = setPermMutation.isPending || removePermMutation.isPending || bulkLoading;

  // super_admin and client_admin have full access ('*') — permission groups don't apply
  const isFullAccessRole =
    user?.userType === 'super_admin' || user?.userType === 'client_admin';

  const roleLabel =
    user?.userType === 'super_admin'
      ? 'Super Administrador'
      : user?.userType === 'client_admin'
        ? 'Administrador de Organización'
        : '';

  return (
    <>
      <Toast ref={toast} />
      <ConfirmDialog />
      <Dialog
        header={user ? `Permisos de ${user.username}` : 'Permisos'}
        visible={!!user}
        onHide={onHide}
        style={{ width: '750px' }}
        maximizable
      >
        {!user ? null : (
          <TabView>
            {/* Groups tab */}
            <TabPanel header={isFullAccessRole ? 'Grupos (N/A)' : `Grupos (${members.length})`}>
              {isFullAccessRole ? (
                <FullAccessNotice roleLabel={roleLabel} />
              ) : (
                <>
                  <div className="flex gap-2 mb-3">
                    <Dropdown
                      value={selectedGroupId}
                      options={availableGroups.map((g) => ({ label: g.name, value: g.id }))}
                      onChange={(e) => setSelectedGroupId(e.value as number)}
                      placeholder="Agregar a un grupo..."
                      className="flex-1"
                      filter
                    />
                    <Button
                      label="Agregar"
                      icon="pi pi-plus"
                      disabled={!selectedGroupId}
                      loading={addToGroupMutation.isPending}
                      onClick={() => selectedGroupId && addToGroupMutation.mutate(selectedGroupId)}
                    />
                  </div>
                  <DataTable value={members} size="small" emptyMessage="No pertenece a ningún grupo">
                    <Column field="name" header="Grupo" />
                    <Column field="description" header="Descripción" body={(r: PermissionGroup) => r.description ?? '-'} />
                    <Column
                      header=""
                      style={{ width: '60px' }}
                      body={(r: PermissionGroup) => (
                        <Button icon="pi pi-times" text size="small" severity="danger" tooltip="Quitar del grupo" tooltipOptions={{ position: 'left' }} onClick={() => handleRemoveFromGroup(r)} />
                      )}
                    />
                  </DataTable>
                </>
              )}
            </TabPanel>

            {/* Individual permissions tab */}
            <TabPanel header={isFullAccessRole ? 'Permisos Individuales (N/A)' : 'Permisos Individuales'}>
              {isFullAccessRole ? (
                <FullAccessNotice roleLabel={roleLabel} />
              ) : loadingCatalog ? (
                <Skeleton height="300px" />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex gap-2 items-start">
                    <i className="pi pi-info-circle text-blue-600 mt-0.5" />
                    <div>
                      <p className="mb-1">Asigná permisos directamente al usuario, sin necesidad de crear un grupo.</p>
                      <p className="text-xs text-blue-600">Usá el checkbox de la sección para otorgar o quitar todos los permisos del módulo de una vez.</p>
                    </div>
                  </div>

                  {Object.entries(catalog ?? {}).map(([module, permissions]) => (
                    <PermissionModuleSection
                      key={module}
                      module={module}
                      permissions={permissions}
                      overrideMap={overrideMap}
                      effectiveSet={effectiveSet}
                      onGrant={(perm) => setPermMutation.mutate({ permissionId: perm.id, granted: true })}
                      onDeny={(perm) => setPermMutation.mutate({ permissionId: perm.id, granted: false })}
                      onRemoveOverride={(perm) => removePermMutation.mutate(perm.id)}
                      onBulkToggle={(perms, grant) => void handleBulkToggleModule(perms, grant)}
                      isLoading={isAnyMutating}
                    />
                  ))}
                </div>
              )}
            </TabPanel>

            {/* Effective permissions tab */}
            <TabPanel header={isFullAccessRole ? 'Permisos Efectivos (acceso total)' : `Permisos Efectivos (${effectiveData?.effective.length ?? 0})`}>
              {isFullAccessRole ? (
                <div className="flex flex-col gap-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex gap-2 items-center">
                    <i className="pi pi-check-circle text-green-600" />
                    <span>
                      Acceso completo. Todos los permisos del sistema están disponibles para este usuario.
                    </span>
                  </div>
                  <Tag value="*  (wildcard — acceso total)" severity="success" className="text-sm" />
                </div>
              ) : loadingEffective ? (
                <Skeleton height="200px" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(effectiveData?.effective ?? []).map((perm) => (
                    <Tag key={perm} value={PERMISSION_LABELS[perm] ?? perm} severity="info" className="text-xs" />
                  ))}
                  {(effectiveData?.effective.length ?? 0) === 0 && (
                    <div className="text-gray-400 text-sm">Sin permisos asignados</div>
                  )}
                </div>
              )}
            </TabPanel>
          </TabView>
        )}
      </Dialog>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function FullAccessNotice({ roleLabel }: { roleLabel: string }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 items-start">
      <i className="pi pi-info-circle text-blue-600 mt-0.5 text-lg" />
      <div>
        <p className="text-sm font-semibold text-blue-800 mb-1">
          Acceso completo — rol: {roleLabel}
        </p>
        <p className="text-sm text-blue-700">
          Este usuario tiene acceso total al sistema. Los permisos individuales y grupos aplican
          únicamente a <strong>usuarios estándar</strong> (client_user).
        </p>
      </div>
    </div>
  );
}

interface PermissionModuleSectionProps {
  module: string;
  permissions: Permission[];
  overrideMap: Map<number, boolean>;
  effectiveSet: Set<string>;
  onGrant: (perm: Permission) => void;
  onDeny: (perm: Permission) => void;
  onRemoveOverride: (perm: Permission) => void;
  onBulkToggle: (permissions: Permission[], grant: boolean) => void;
  isLoading: boolean;
}

function PermissionModuleSection({
  module,
  permissions,
  overrideMap,
  effectiveSet,
  onGrant,
  onDeny,
  onRemoveOverride,
  onBulkToggle,
  isLoading,
}: PermissionModuleSectionProps) {
  const moduleLabel = MODULE_LABELS[module] ?? module;

  // Calculate module-level checkbox state
  const allEffective = permissions.every((p) => effectiveSet.has(`${p.module}.${p.action}`));
  const someEffective = permissions.some((p) => effectiveSet.has(`${p.module}.${p.action}`));

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center gap-3">
        <Checkbox
          checked={allEffective}
          disabled={isLoading}
          onChange={() => onBulkToggle(permissions, !allEffective)}
          tooltip={allEffective ? 'Quitar todos los permisos de esta sección' : 'Otorgar todos los permisos de esta sección'}
          tooltipOptions={{ position: 'right' }}
          className={someEffective && !allEffective ? 'p-checkbox-partial' : ''}
        />
        <span className="font-semibold text-sm text-[#1b3a5f]">{moduleLabel}</span>
        <span className="text-xs text-gray-400 ml-auto">
          {permissions.filter((p) => effectiveSet.has(`${p.module}.${p.action}`)).length}/{permissions.length}
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {permissions.map((perm) => {
          const key = `${perm.module}.${perm.action}`;
          const hasOverride = overrideMap.has(perm.id);
          const overrideGranted = overrideMap.get(perm.id);
          const isEffective = effectiveSet.has(key);

          return (
            <div key={perm.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-sm">
              {/* Checkbox */}
              <Checkbox
                checked={isEffective}
                disabled={isLoading}
                onChange={() => {
                  if (hasOverride && overrideGranted) {
                    onRemoveOverride(perm);
                  } else if (isEffective) {
                    onDeny(perm);
                  } else {
                    onGrant(perm);
                  }
                }}
              />

              {/* Permission label */}
              <div className="flex-1 min-w-0">
                <span className={isEffective ? 'text-gray-800' : 'text-gray-400'}>
                  {PERMISSION_LABELS[key] ?? perm.label ?? key}
                </span>
              </div>

              {/* Status */}
              <div className="w-24 text-center shrink-0">
                {hasOverride ? (
                  <Tag
                    value={overrideGranted ? 'Individual' : 'Denegado'}
                    severity={overrideGranted ? 'success' : 'danger'}
                    className="text-xs"
                  />
                ) : isEffective ? (
                  <Tag value="Por grupo" severity="info" className="text-xs" />
                ) : (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </div>

              {/* Undo override button */}
              <div className="w-8 shrink-0">
                {hasOverride && (
                  <Button
                    icon="pi pi-undo"
                    text
                    size="small"
                    severity="secondary"
                    tooltip="Quitar override (usar valor del grupo)"
                    tooltipOptions={{ position: 'left' }}
                    disabled={isLoading}
                    onClick={() => onRemoveOverride(perm)}
                    className="!p-1"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
