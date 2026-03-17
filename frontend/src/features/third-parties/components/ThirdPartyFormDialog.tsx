import { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { thirdPartiesApi, type CreateThirdPartyPayload } from '../api/thirdPartiesApi';
import { apiErrMsg } from '../../../shared/utils/apiErrMsg';
import type { ThirdParty } from '../../../shared/types';

interface Props {
  visible: boolean;
  onHide: () => void;
  onSaved?: (id: number) => void;
  thirdParty?: ThirdParty; // if provided, dialog is in edit mode
}

type FormValues = {
  name: string;
  clientCode: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  website: string;
  notes: string;
};

const emptyValues: FormValues = {
  name: '',
  clientCode: '',
  taxId: '',
  email: '',
  phone: '',
  address: '',
  postalCode: '',
  city: '',
  website: '',
  notes: '',
};

export function ThirdPartyFormDialog({ visible, onHide, onSaved, thirdParty }: Props) {
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState('');
  const isEdit = !!thirdParty;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: emptyValues,
  });

  // Reset form when dialog opens or thirdParty changes
  useEffect(() => {
    if (visible) {
      if (thirdParty) {
        reset({
          name: thirdParty.name,
          clientCode: thirdParty.clientCode ?? '',
          taxId: thirdParty.taxId ?? '',
          email: thirdParty.email ?? '',
          phone: thirdParty.phone ?? '',
          address: thirdParty.address ?? '',
          postalCode: thirdParty.postalCode ?? '',
          city: thirdParty.city ?? '',
          website: thirdParty.website ?? '',
          notes: thirdParty.notes ?? '',
        });
      } else {
        reset(emptyValues);
      }
      setErrorMsg('');
    }
  }, [visible, thirdParty, reset]);

  const createMut = useMutation({
    mutationFn: (payload: CreateThirdPartyPayload) => thirdPartiesApi.create(payload),
    onSuccess: (tp) => {
      void queryClient.invalidateQueries({ queryKey: ['third-parties'] });
      reset(emptyValues);
      setErrorMsg('');
      onHide();
      onSaved?.(tp.id);
    },
    onError: (err) => setErrorMsg(apiErrMsg(err, 'Error al crear el tercero')),
  });

  const updateMut = useMutation({
    mutationFn: (payload: CreateThirdPartyPayload) =>
      thirdPartiesApi.update(thirdParty!.id, payload),
    onSuccess: (tp) => {
      void queryClient.invalidateQueries({ queryKey: ['third-parties'] });
      void queryClient.invalidateQueries({ queryKey: ['third-parties', thirdParty!.id] });
      setErrorMsg('');
      onHide();
      onSaved?.(tp.id);
    },
    onError: (err) => setErrorMsg(apiErrMsg(err, 'Error al actualizar el tercero')),
  });

  const onSubmit = (values: FormValues) => {
    const payload: CreateThirdPartyPayload = {
      name: values.name,
      clientCode: values.clientCode || undefined,
      taxId: values.taxId || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      address: values.address || undefined,
      postalCode: values.postalCode || undefined,
      city: values.city || undefined,
      website: values.website || undefined,
      notes: values.notes || undefined,
    };

    if (isEdit) {
      updateMut.mutate(payload);
    } else {
      createMut.mutate(payload);
    }
  };

  const handleHide = () => {
    reset(emptyValues);
    setErrorMsg('');
    onHide();
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog
      header={isEdit ? 'Editar Tercero' : 'Nuevo Tercero'}
      visible={visible}
      onHide={handleHide}
      style={{ width: '650px' }}
      modal
      draggable={false}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 pt-2">

        {/* Datos principales */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos principales</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Nombre <span className="text-red-400">*</span>
              </label>
              <InputText
                {...register('name', { required: 'El nombre es obligatorio' })}
                placeholder="Nombre o razón social"
                className={`w-full ${errors.name ? 'p-invalid' : ''}`}
              />
              {errors.name && <small className="text-red-500">{errors.name.message}</small>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Código cliente</label>
              <InputText
                {...register('clientCode')}
                placeholder="Ej: CL0001"
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">CUIT</label>
              <InputText
                {...register('taxId')}
                placeholder="Ej: 30-12345678-9"
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contacto</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <InputText
                {...register('email')}
                placeholder="email@ejemplo.com"
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Teléfono</label>
              <InputText
                {...register('phone')}
                placeholder="+54 11 1234-5678"
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Website</label>
              <InputText
                {...register('website')}
                placeholder="https://..."
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Dirección */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dirección</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Dirección</label>
              <InputText
                {...register('address')}
                placeholder="Calle y número"
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Ciudad</label>
              <InputText
                {...register('city')}
                placeholder="Ciudad"
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Código Postal</label>
              <InputText
                {...register('postalCode')}
                placeholder="CP"
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Notas */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Notas</label>
          <InputTextarea
            {...register('notes')}
            rows={3}
            placeholder="Notas internas..."
            className="w-full"
          />
        </div>

        {errorMsg && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{errorMsg}</p>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" label="Cancelar" severity="secondary" outlined onClick={handleHide} />
          <Button
            type="submit"
            label={isEdit ? 'Guardar cambios' : 'Crear tercero'}
            icon="pi pi-check"
            loading={isPending}
            className="bg-[#1b3a5f] text-white border-[#1b3a5f]"
          />
        </div>
      </form>
    </Dialog>
  );
}
