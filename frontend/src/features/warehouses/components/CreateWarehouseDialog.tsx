import { useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { warehousesApi, type CreateWarehousePayload } from '../api/warehousesApi';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useTenants, canManageTenants } from '../../../shared/hooks/useTenants';
import type { Warehouse } from '../../../shared/types';

interface Props {
  visible: boolean;
  onHide: () => void;
  warehouse?: Warehouse;
}

const STATUS_OPTIONS = [
  { label: 'Abierto', value: 1 },
  { label: 'Cerrado', value: 0 },
];

export function CreateWarehouseDialog({ visible, onHide, warehouse }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = canManageTenants(user?.userType);
  const { data: tenantsData } = useTenants();
  const tenantOptions = (tenantsData ?? []).map((t) => ({ label: t.name, value: t.id }));
  const isEdit = !!warehouse;

  const { control, handleSubmit, reset, formState: { errors } } = useForm<CreateWarehousePayload>({
    defaultValues: { name: '', shortName: '', description: '', location: '', address: '', phone: '', status: 1, tenantId: undefined },
  });

  useEffect(() => {
    if (!visible) return;
    if (warehouse) {
      reset({
        name: warehouse.name,
        shortName: warehouse.shortName ?? '',
        description: warehouse.description ?? '',
        location: warehouse.location ?? '',
        address: warehouse.address ?? '',
        phone: warehouse.phone ?? '',
        status: warehouse.status,
        tenantId: warehouse.tenant?.id ?? warehouse.entity ?? undefined,
      });
    } else {
      reset({ name: '', shortName: '', description: '', location: '', address: '', phone: '', status: 1, tenantId: undefined });
    }
  }, [visible, warehouse, reset]);

  const createMut = useMutation({
    mutationFn: warehousesApi.create,
    onSuccess: (wh) => {
      void queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      reset();
      onHide();
      navigate(`/warehouses/${wh.id}`);
    },
  });

  const updateMut = useMutation({
    mutationFn: (values: CreateWarehousePayload) => warehousesApi.update(warehouse!.id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      void queryClient.invalidateQueries({ queryKey: ['warehouses', warehouse!.id] });
      onHide();
    },
  });

  const onSubmit = (values: CreateWarehousePayload) => {
    if (isEdit) updateMut.mutate(values);
    else createMut.mutate(values);
  };

  const pending = isEdit ? updateMut.isPending : createMut.isPending;
  const error = isEdit ? updateMut.isError : createMut.isError;

  return (
    <Dialog
      header={isEdit ? 'Editar Almacén' : 'Nuevo Almacén'}
      visible={visible}
      onHide={() => { reset(); onHide(); }}
      style={{ width: '520px' }}
      modal
      draggable={false}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">

        {isSuperAdmin && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Organización <span className="text-red-400">*</span>
            </label>
            <Controller
              name="tenantId"
              control={control}
              rules={{ required: 'La organización es obligatoria' }}
              render={({ field }) => (
                <Dropdown
                  value={field.value}
                  onChange={(e) => field.onChange(e.value)}
                  options={tenantOptions}
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Seleccionar organización"
                  className={`w-full ${errors.tenantId ? 'p-invalid' : ''}`}
                  filter
                />
              )}
            />
            {errors.tenantId && <small className="text-red-500">{errors.tenantId.message}</small>}
          </div>
        )}

        {/* Nombre */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Nombre <span className="text-red-400">*</span>
          </label>
          <Controller
            name="name"
            control={control}
            rules={{ required: 'El nombre es obligatorio' }}
            render={({ field }) => (
              <InputText {...field} className={`w-full ${errors.name ? 'p-invalid' : ''}`} placeholder="Almacen central" />
            )}
          />
          {errors.name && <small className="text-red-500">{errors.name.message}</small>}
        </div>

        {/* Nombre corto */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Nombre corto</label>
          <Controller
            name="shortName"
            control={control}
            render={({ field }) => (
              <InputText {...field} value={field.value ?? ''} className="w-full" placeholder="ACE" />
            )}
          />
        </div>

        {/* Descripción */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Descripción</label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <InputText {...field} value={field.value ?? ''} className="w-full" placeholder="Descripción opcional" />
            )}
          />
        </div>

        {/* Dirección */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Dirección</label>
          <Controller
            name="address"
            control={control}
            render={({ field }) => (
              <InputText {...field} value={field.value ?? ''} className="w-full" placeholder="Av. Ejemplo 1234, Buenos Aires" />
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Ubicación/ciudad */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Ciudad / Ubicación</label>
            <Controller
              name="location"
              control={control}
              render={({ field }) => (
                <InputText {...field} value={field.value ?? ''} className="w-full" placeholder="Buenos Aires" />
              )}
            />
          </div>

          {/* Teléfono */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Teléfono</label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <InputText {...field} value={field.value ?? ''} className="w-full" placeholder="+54 11 1234-5678" />
              )}
            />
          </div>
        </div>

        {/* Estado */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Estado</label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Dropdown
                {...field}
                options={STATUS_OPTIONS}
                optionLabel="label"
                optionValue="value"
                className="w-full"
              />
            )}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            Error al {isEdit ? 'actualizar' : 'crear'} el almacén. Verificá los datos.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            label="Cancelar"
            severity="secondary"
            outlined
            onClick={() => { reset(); onHide(); }}
          />
          <Button
            type="submit"
            label={isEdit ? 'Guardar Cambios' : 'Crear Almacén'}
            icon="pi pi-check"
            loading={pending}
            className="bg-[#1b3a5f] text-white border-[#1b3a5f]"
          />
        </div>
      </form>
    </Dialog>
  );
}
