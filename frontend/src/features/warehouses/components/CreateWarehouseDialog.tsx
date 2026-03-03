import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { warehousesApi, type CreateWarehousePayload } from '../api/warehousesApi';

interface Props {
  visible: boolean;
  onHide: () => void;
}

const STATUS_OPTIONS = [
  { label: 'Abierto', value: 1 },
  { label: 'Cerrado', value: 0 },
];

export function CreateWarehouseDialog({ visible, onHide }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<CreateWarehousePayload>({
    defaultValues: { name: '', shortName: '', description: '', location: '', address: '', phone: '', status: 1 },
  });

  const createMut = useMutation({
    mutationFn: warehousesApi.create,
    onSuccess: (warehouse) => {
      void queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      reset();
      onHide();
      navigate(`/warehouses/${warehouse.id}`);
    },
  });

  const onSubmit = (values: CreateWarehousePayload) => {
    createMut.mutate(values);
  };

  return (
    <Dialog
      header="Nuevo Almacén"
      visible={visible}
      onHide={() => { reset(); onHide(); }}
      style={{ width: '520px' }}
      modal
      draggable={false}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">

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

        {createMut.isError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            Error al crear el almacén. Verificá los datos.
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
            label="Crear Almacén"
            icon="pi pi-check"
            loading={createMut.isPending}
            className="bg-[#1b3a5f] text-white border-[#1b3a5f]"
          />
        </div>
      </form>
    </Dialog>
  );
}
