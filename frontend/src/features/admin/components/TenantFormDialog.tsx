import { useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsApi, type CreateTenantDto } from '../api/tenantsApi';
import type { Tenant } from '../../../shared/types';

interface Props {
  visible: boolean;
  onHide: () => void;
  tenant?: Tenant | null; // null/undefined = create mode
}

interface FormData {
  name: string;
  code: string;
}

export function TenantFormDialog({ visible, onHide, tenant }: Props) {
  const toast = useRef<Toast>(null);
  const qc = useQueryClient();
  const isEdit = !!tenant;

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { name: '', code: '' },
  });

  useEffect(() => {
    if (visible) {
      reset({ name: tenant?.name ?? '', code: tenant?.code ?? '' });
    }
  }, [visible, tenant, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit
        ? tenantsApi.update(tenant!.id, data)
        : tenantsApi.create(data as CreateTenantDto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tenants'] });
      toast.current?.show({ severity: 'success', summary: 'Guardado', detail: isEdit ? 'Tenant actualizado' : 'Tenant creado', life: 3000 });
      onHide();
    },
    onError: () => {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el tenant', life: 4000 });
    },
  });

  const footer = (
    <div className="flex justify-end gap-2">
      <Button label="Cancelar" outlined severity="secondary" onClick={onHide} />
      <Button label={isEdit ? 'Guardar' : 'Crear'} icon="pi pi-check" loading={mutation.isPending} onClick={() => void handleSubmit((d) => mutation.mutate(d))()} />
    </div>
  );

  return (
    <>
      <Toast ref={toast} />
      <Dialog
        header={isEdit ? 'Editar Tenant' : 'Nuevo Tenant'}
        visible={visible}
        onHide={onHide}
        footer={footer}
        style={{ width: '420px' }}
        breakpoints={{ '640px': '95vw', '575px': '100vw' }}
      >
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Nombre *</label>
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Requerido' }}
              render={({ field }) => (
                <InputText {...field} className={`w-full ${errors.name ? 'p-invalid' : ''}`} placeholder="Ej: Acme Corp" />
              )}
            />
            {errors.name && <small className="text-red-500">{errors.name.message}</small>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Código *</label>
            <Controller
              name="code"
              control={control}
              rules={{ required: 'Requerido' }}
              render={({ field }) => (
                <InputText {...field} className={`w-full ${errors.code ? 'p-invalid' : ''}`} placeholder="Ej: ACME" onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
              )}
            />
            {errors.code && <small className="text-red-500">{errors.code.message}</small>}
            <small className="text-gray-400">Se usará como código interno único (en mayúsculas)</small>
          </div>
        </div>
      </Dialog>
    </>
  );
}
