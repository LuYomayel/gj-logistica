import { useEffect, useRef } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsApi, type CreateTenantDto } from '../api/tenantsApi';
import { apiErrMsg } from '../../../shared/utils/apiErrMsg';
import { buildRefPrefix } from '../../../shared/utils/refPrefix';
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

  // El código define el prefijo de los refs autogenerados de productos (PREFIX-N).
  const code = useWatch({ control, name: 'code' });
  const prefix = buildRefPrefix(code);
  const previousPrefix = isEdit ? buildRefPrefix(tenant?.code ?? '') : '';
  const prefixChanged = isEdit && !!previousPrefix && !!prefix && prefix !== previousPrefix;

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
      toast.current?.show({ severity: 'success', summary: 'Guardado', detail: isEdit ? 'Organización actualizada' : 'Organización creada', life: 3000 });
      onHide();
    },
    onError: (err) => {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: apiErrMsg(err, 'No se pudo guardar la organización'), life: 4000 });
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
        header={isEdit ? 'Editar Organización' : 'Nueva Organización'}
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
              rules={{
                required: 'Requerido',
                validate: (v) => buildRefPrefix(v) !== '' || 'El código debe tener al menos una letra o un número',
              }}
              render={({ field }) => (
                <InputText {...field} className={`w-full ${errors.code ? 'p-invalid' : ''}`} placeholder="Ej: ACME" onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
              )}
            />
            {errors.code && <small className="text-red-500">{errors.code.message}</small>}
            <small className="text-gray-400">Código interno único. También define la referencia de los productos nuevos.</small>
            {code && prefix && (
              <div className="text-sm rounded px-3 py-2 border bg-blue-50 border-blue-200 text-blue-800">
                Referencias de productos nuevos:{' '}
                {isEdit ? (
                  <strong className="font-mono whitespace-nowrap">{prefix}-N</strong>
                ) : (
                  <>
                    <strong className="font-mono whitespace-nowrap">{prefix}-1</strong>,{' '}
                    <strong className="font-mono whitespace-nowrap">{prefix}-2</strong>…
                  </>
                )}
              </div>
            )}
            {code && !prefix && (
              <div className="text-sm rounded px-3 py-2 border bg-red-50 border-red-200 text-red-700">
                Con este código no se pueden generar referencias automáticas para los productos.
              </div>
            )}
            {prefixChanged && (
              <div className="text-sm rounded px-3 py-2 border bg-amber-50 border-amber-200 text-amber-800">
                Los productos que ya existen mantienen su referencia (<span className="font-mono whitespace-nowrap">{previousPrefix}-N</span>).
                Solo los nuevos van a usar <span className="font-mono whitespace-nowrap">{prefix}-N</span>, y la numeración sigue desde donde iba.
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}
