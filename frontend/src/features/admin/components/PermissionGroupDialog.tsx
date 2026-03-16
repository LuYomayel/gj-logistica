import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Toast } from 'primereact/toast';
import { Divider } from 'primereact/divider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { permissionsApi } from '../api/permissionsApi';
import type { Permission, PermissionGroup } from '../../../shared/types';

interface Props {
  visible: boolean;
  onHide: () => void;
  group?: PermissionGroup | null;
}

interface FormData {
  name: string;
  description: string;
}

// Module display names
const MODULE_LABELS: Record<string, string> = {
  users: 'Usuarios',
  third_parties: 'Empresas',
  contacts: 'Contactos',
  orders: 'Pedidos',
  products: 'Productos',
  stock: 'Stock / Almacenes',
  barcodes: 'Códigos de Barras',
  import: 'Importación',
  export: 'Exportación',
  tenants: 'Organizaciones (Admin)',
};

export function PermissionGroupDialog({ visible, onHide, group }: Props) {
  const toast = useRef<Toast>(null);
  const qc = useQueryClient();
  const isEdit = !!group;
  const [advancedMode, setAdvancedMode] = useState(false);
  const [selectedPermIds, setSelectedPermIds] = useState<Set<number>>(new Set());

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { name: '', description: '' },
  });

  // Load permission catalog
  const { data: catalog = {} } = useQuery({
    queryKey: ['permissions-catalog'],
    queryFn: permissionsApi.getCatalog,
    enabled: visible,
  });

  // Load existing group permissions when editing
  const { data: existingPerms = [] } = useQuery({
    queryKey: ['group-permissions', group?.id],
    queryFn: () => permissionsApi.getGroupPermissions(group!.id),
    enabled: visible && isEdit && !!group?.id,
  });

  useEffect(() => {
    if (visible) {
      reset({ name: group?.name ?? '', description: group?.description ?? '' });
      setAdvancedMode(false);
      // For create mode, always start with no permissions selected
      if (!isEdit) {
        setSelectedPermIds(new Set());
      }
    }
  }, [visible, group, reset, isEdit]);

  // For edit mode: load existing permissions once they're available from the query
  useEffect(() => {
    if (isEdit && existingPerms.length > 0) {
      setSelectedPermIds(new Set(existingPerms.map((p) => p.id)));
    }
  }, [isEdit, existingPerms]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const newGroup = await permissionsApi.createGroup({ name: data.name, description: data.description || undefined });
      // Add all selected permissions
      for (const permId of selectedPermIds) {
        await permissionsApi.addPermissionToGroup(newGroup.id, permId);
      }
      return newGroup;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['permission-groups'] });
      toast.current?.show({ severity: 'success', summary: 'Creado', detail: 'Grupo creado correctamente', life: 3000 });
      onHide();
    },
    onError: () => {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el grupo', life: 4000 });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      await permissionsApi.updateGroup(group!.id, { name: data.name, description: data.description || undefined });
      // Sync permissions: add new, remove removed
      const existingIds = new Set(existingPerms.map((p) => p.id));
      const toAdd = [...selectedPermIds].filter((id) => !existingIds.has(id));
      const toRemove = [...existingIds].filter((id) => !selectedPermIds.has(id));
      for (const permId of toAdd) await permissionsApi.addPermissionToGroup(group!.id, permId);
      for (const permId of toRemove) await permissionsApi.removePermissionFromGroup(group!.id, permId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['permission-groups'] });
      void qc.invalidateQueries({ queryKey: ['group-permissions', group?.id] });
      toast.current?.show({ severity: 'success', summary: 'Guardado', detail: 'Grupo actualizado', life: 3000 });
      onHide();
    },
    onError: () => {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar', life: 4000 });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const togglePerm = (permId: number) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const toggleAll = (perms: Permission[], checked: boolean) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      for (const p of perms) { if (checked) next.add(p.id); else next.delete(p.id); }
      return next;
    });
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <Button label="Cancelar" outlined severity="secondary" onClick={onHide} />
      <Button
        label={isEdit ? 'Guardar' : 'Crear'}
        icon="pi pi-check"
        loading={isPending}
        onClick={() => void handleSubmit((d) => isEdit ? updateMutation.mutate(d) : createMutation.mutate(d))()}
      />
    </div>
  );

  return (
    <>
      <Toast ref={toast} />
      <Dialog
        header={isEdit ? 'Editar Grupo de Permisos' : 'Nuevo Grupo de Permisos'}
        visible={visible}
        onHide={onHide}
        footer={footer}
        style={{ width: '650px' }}
        breakpoints={{ '768px': '95vw', '575px': '100vw' }}
        maximizable
      >
        <div className="flex flex-col gap-4 mt-2">
          {/* Name + Description */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Nombre *</label>
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Requerido' }}
              render={({ field }) => <InputText {...field} className={`w-full ${errors.name ? 'p-invalid' : ''}`} placeholder="Ej: Ventas" />}
            />
            {errors.name && <small className="text-red-500">{errors.name.message}</small>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Descripción</label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => <InputTextarea {...field} rows={2} className="w-full" placeholder="Descripción opcional" />}
            />
          </div>

          <Divider />

          {/* Permissions panel */}
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-700">Permisos</span>
            <div className="flex items-center gap-2">
              <Checkbox
                inputId="advanced-mode"
                checked={advancedMode}
                onChange={(e) => setAdvancedMode(e.checked ?? false)}
              />
              <label htmlFor="advanced-mode" className="text-sm text-gray-500 cursor-pointer">Modo avanzado</label>
            </div>
          </div>

          <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
            {Object.entries(catalog).map(([module, perms]) => {
              const visiblePerms = advancedMode ? perms : perms.filter((p) => !p.isAdvanced);
              if (!visiblePerms.length) return null;
              const allChecked = visiblePerms.every((p) => selectedPermIds.has(p.id));
              const someChecked = visiblePerms.some((p) => selectedPermIds.has(p.id));

              return (
                <div key={module} className="border border-gray-200 rounded-lg p-3">
                  {/* Module header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allChecked}
                        onChange={(e) => toggleAll(visiblePerms, e.checked ?? false)}
                        className={someChecked && !allChecked ? 'p-checkbox-indeterminate' : ''}
                      />
                      <span className="font-semibold text-sm text-gray-800 uppercase tracking-wide">
                        {MODULE_LABELS[module] ?? module}
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        className="text-blue-500 hover:underline"
                        onClick={() => toggleAll(visiblePerms, true)}
                      >
                        Todos
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        className="text-gray-400 hover:underline"
                        onClick={() => toggleAll(visiblePerms, false)}
                      >
                        Ninguno
                      </button>
                    </div>
                  </div>

                  {/* Permission checkboxes */}
                  <div className="flex flex-col gap-1.5 pl-6">
                    {visiblePerms.map((perm) => (
                      <div key={perm.id} className="flex items-center gap-2">
                        <Checkbox
                          inputId={`perm-${perm.id}`}
                          checked={selectedPermIds.has(perm.id)}
                          onChange={() => togglePerm(perm.id)}
                        />
                        <label htmlFor={`perm-${perm.id}`} className="text-sm text-gray-700 cursor-pointer">
                          {perm.label}
                          {perm.isAdvanced && (
                            <span className="ml-1.5 text-[10px] bg-orange-100 text-orange-600 px-1 rounded font-medium">ADV</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {Object.keys(catalog).length === 0 && (
              <div className="text-center text-gray-400 py-4">Cargando permisos...</div>
            )}
          </div>

          <div className="text-xs text-gray-400 text-right">
            {selectedPermIds.size} permiso{selectedPermIds.size !== 1 ? 's' : ''} seleccionado{selectedPermIds.size !== 1 ? 's' : ''}
          </div>
        </div>
      </Dialog>
    </>
  );
}
