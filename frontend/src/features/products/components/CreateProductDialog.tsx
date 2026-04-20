import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { productsApi, type CreateProductPayload } from '../api/productsApi';
import { apiErrMsg } from '../../../shared/utils/apiErrMsg';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useTenants, canManageTenants } from '../../../shared/hooks/useTenants';

interface Props {
  visible: boolean;
  onHide: () => void;
  onCreated?: (id: number) => void;
}

type FormValues = CreateProductPayload & { description: string };

export function CreateProductDialog({ visible, onHide, onCreated }: Props) {
  const queryClient = useQueryClient();
  const { hasPermission, user } = useAuth();
  const showTenantSelector = canManageTenants(user?.userType);
  const { data: tenants = [] } = useTenants();
  const activeTenants = tenants.filter((t) => t.isActive);
  const [errorMsg, setErrorMsg] = useState('');

  const { handleSubmit, reset, register, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      ref: '',
      label: '',
      description: '',
      posicion: '',
      color: '',
      marca: '',
      subrubro: '',
      rubro: '',
      talle: '',
      tenantId: undefined,
    },
  });

  const mut = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: CreateProductPayload = {
        ref: values.ref,
        label: values.label || undefined,
        description: values.description || undefined,
        posicion: values.posicion || undefined,
        color: values.color || undefined,
        marca: values.marca || undefined,
        subrubro: values.subrubro || undefined,
        rubro: values.rubro || undefined,
        talle: values.talle || undefined,
        tenantId: showTenantSelector ? values.tenantId : undefined,
      };
      return productsApi.create(payload);
    },
    onSuccess: (product) => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      reset();
      setErrorMsg('');
      onHide();
      onCreated?.(product.id);
    },
    onError: (err) => setErrorMsg(apiErrMsg(err, 'Error al crear el producto')),
  });

  const handleHide = () => {
    reset();
    setErrorMsg('');
    onHide();
  };

  return (
    <Dialog
      header="Nuevo Producto"
      visible={visible}
      onHide={handleHide}
      style={{ width: '700px' }}
      breakpoints={{ '960px': '90vw', '768px': '95vw', '575px': '100vw' }}
      modal
      draggable={false}
    >
      <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="flex flex-col gap-5 pt-2">

        {showTenantSelector && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Organización</p>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Organización <span className="text-red-400">*</span>
              </label>
              <Controller
                name="tenantId"
                control={control}
                rules={{ required: 'Seleccione una organización' }}
                render={({ field, fieldState }) => (
                  <>
                    <Dropdown
                      value={field.value}
                      onChange={(e) => field.onChange(e.value)}
                      options={activeTenants.map((t) => ({ label: `${t.name} (${t.code})`, value: t.id }))}
                      placeholder="Seleccione organización..."
                      filter
                      className={`w-full ${fieldState.error ? 'p-invalid' : ''}`}
                    />
                    {fieldState.error && <small className="text-red-500">{fieldState.error.message}</small>}
                  </>
                )}
              />
            </div>
          </div>
        )}

        {/* ── Sección: Datos básicos ── */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos básicos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Ref <span className="text-red-400">*</span>
              </label>
              <InputText
                {...register('ref', { required: 'La ref es obligatoria' })}
                placeholder="Ej: BI000032"
                className={`w-full ${errors.ref ? 'p-invalid' : ''}`}
              />
              {errors.ref && <small className="text-red-500">{errors.ref.message}</small>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Etiqueta</label>
              <InputText
                {...register('label')}
                placeholder="Nombre del producto"
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* ── Sección: Clasificación ── */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Clasificación</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Rubro</label>
              <InputText {...register('rubro')} placeholder="Rubro..." className="w-full" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">SubRubro</label>
              <InputText {...register('subrubro')} placeholder="SubRubro..." className="w-full" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Marca</label>
              <InputText {...register('marca')} placeholder="Marca..." className="w-full" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Talle</label>
              <InputText {...register('talle')} placeholder="S, M, L, XL..." className="w-full" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Color</label>
              <InputText {...register('color')} placeholder="Color..." className="w-full" />
            </div>
            {hasPermission('products.read_position') && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Posición</label>
                <InputText {...register('posicion')} placeholder="Ej: A1-B2" className="w-full" />
              </div>
            )}
          </div>
        </div>

        {/* ── Sección: Descripción ── */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Descripción</label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <InputTextarea
                {...field}
                rows={3}
                placeholder="Descripción del producto..."
                className="w-full"
              />
            )}
          />
        </div>

        {errorMsg && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{errorMsg}</p>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" label="Cancelar" severity="secondary" outlined onClick={handleHide} />
          <Button
            type="submit"
            label="Crear producto"
            icon="pi pi-check"
            loading={mut.isPending}
            className="bg-[#1b3a5f] text-white border-[#1b3a5f]"
          />
        </div>
      </form>
    </Dialog>
  );
}
