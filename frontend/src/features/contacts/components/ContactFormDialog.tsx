import { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { contactsApi, type CreateContactPayload } from '../api/contactsApi';
import { thirdPartiesApi } from '../../third-parties/api/thirdPartiesApi';
import type { Contact } from '../../../shared/types';

interface Props {
  visible: boolean;
  onHide: () => void;
  onSaved?: (id: number) => void;
  contact?: Contact; // if provided, dialog is in edit mode
}

type FormValues = {
  firstName: string;
  lastName: string;
  thirdPartyId: number | null;
  email: string;
  phonePro: string;
  phoneMobile: string;
  address: string;
  city: string;
  postalCode: string;
  marca: string;
  dni: number | null;
  lugarDeEntrega: string;
  nombreFantasia: string;
};

const emptyValues: FormValues = {
  firstName: '',
  lastName: '',
  thirdPartyId: null,
  email: '',
  phonePro: '',
  phoneMobile: '',
  address: '',
  city: '',
  postalCode: '',
  marca: '',
  dni: null,
  lugarDeEntrega: '',
  nombreFantasia: '',
};

const apiErrMsg = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.join(', ');
  }
  return fallback;
};

export function ContactFormDialog({ visible, onHide, onSaved, contact }: Props) {
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState('');
  const isEdit = !!contact;

  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: emptyValues,
  });

  // Load third parties for dropdown
  const { data: tpData } = useQuery({
    queryKey: ['third-parties', { limit: 500 }],
    queryFn: () => thirdPartiesApi.list({ limit: 500 }),
    enabled: visible,
  });

  const tpOptions = (tpData?.data ?? []).map((tp) => ({
    label: tp.name,
    value: tp.id,
  }));

  // Reset form when dialog opens
  useEffect(() => {
    if (visible) {
      if (contact) {
        reset({
          firstName: contact.firstName ?? '',
          lastName: contact.lastName ?? '',
          thirdPartyId: contact.thirdPartyId,
          email: contact.email ?? '',
          phonePro: contact.phonePro ?? '',
          phoneMobile: contact.phoneMobile ?? '',
          address: contact.address ?? '',
          city: contact.city ?? '',
          postalCode: contact.postalCode ?? '',
          marca: contact.marca ?? '',
          dni: contact.dni,
          lugarDeEntrega: contact.lugarDeEntrega ?? '',
          nombreFantasia: contact.nombreFantasia ?? '',
        });
      } else {
        reset(emptyValues);
      }
      setErrorMsg('');
    }
  }, [visible, contact, reset]);

  const createMut = useMutation({
    mutationFn: (payload: CreateContactPayload) => contactsApi.create(payload),
    onSuccess: (c) => {
      void queryClient.invalidateQueries({ queryKey: ['contacts'] });
      reset(emptyValues);
      setErrorMsg('');
      onHide();
      onSaved?.(c.id);
    },
    onError: (err) => setErrorMsg(apiErrMsg(err, 'Error al crear el contacto')),
  });

  const updateMut = useMutation({
    mutationFn: (payload: CreateContactPayload) =>
      contactsApi.update(contact!.id, payload),
    onSuccess: (c) => {
      void queryClient.invalidateQueries({ queryKey: ['contacts'] });
      void queryClient.invalidateQueries({ queryKey: ['contacts', contact!.id] });
      setErrorMsg('');
      onHide();
      onSaved?.(c.id);
    },
    onError: (err) => setErrorMsg(apiErrMsg(err, 'Error al actualizar el contacto')),
  });

  const onSubmit = (values: FormValues) => {
    const payload: CreateContactPayload = {
      firstName: values.firstName,
      lastName: values.lastName,
      thirdPartyId: values.thirdPartyId ?? undefined,
      email: values.email || undefined,
      phonePro: values.phonePro || undefined,
      phoneMobile: values.phoneMobile || undefined,
      address: values.address || undefined,
      city: values.city || undefined,
      postalCode: values.postalCode || undefined,
      marca: values.marca || undefined,
      dni: values.dni ?? undefined,
      lugarDeEntrega: values.lugarDeEntrega || undefined,
      nombreFantasia: values.nombreFantasia || undefined,
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
      header={isEdit ? 'Editar Contacto' : 'Nuevo Contacto'}
      visible={visible}
      onHide={handleHide}
      style={{ width: '700px' }}
      modal
      draggable={false}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 pt-2">

        {/* Datos personales */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos personales</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Nombre <span className="text-red-400">*</span>
              </label>
              <InputText
                {...register('firstName', { required: 'El nombre es obligatorio' })}
                placeholder="Nombre"
                className={`w-full ${errors.firstName ? 'p-invalid' : ''}`}
              />
              {errors.firstName && <small className="text-red-500">{errors.firstName.message}</small>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Apellido <span className="text-red-400">*</span>
              </label>
              <InputText
                {...register('lastName', { required: 'El apellido es obligatorio' })}
                placeholder="Apellido"
                className={`w-full ${errors.lastName ? 'p-invalid' : ''}`}
              />
              {errors.lastName && <small className="text-red-500">{errors.lastName.message}</small>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">DNI</label>
              <Controller
                name="dni"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    value={field.value}
                    onValueChange={(e) => field.onChange(e.value ?? null)}
                    useGrouping={false}
                    placeholder="12345678"
                    inputClassName="w-full"
                  />
                )}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Nombre fantasía</label>
              <InputText
                {...register('nombreFantasia')}
                placeholder="Nombre fantasía..."
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Tercero y marca */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Asociación</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Tercero</label>
              <Controller
                name="thirdPartyId"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    value={field.value}
                    options={tpOptions}
                    onChange={(e) => field.onChange(e.value)}
                    placeholder="Seleccionar tercero..."
                    showClear
                    filter
                    className="w-full"
                  />
                )}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Marca</label>
              <InputText
                {...register('marca')}
                placeholder="Marca..."
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
              <label className="text-sm font-medium text-gray-700">Teléfono trabajo</label>
              <InputText
                {...register('phonePro')}
                placeholder="+54 11 1234-5678"
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Celular</label>
              <InputText
                {...register('phoneMobile')}
                placeholder="+54 11 1234-5678"
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
              <InputText {...register('city')} placeholder="Ciudad" className="w-full" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Código Postal</label>
              <InputText {...register('postalCode')} placeholder="CP" className="w-full" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Lugar de entrega</label>
              <InputText
                {...register('lugarDeEntrega')}
                placeholder="Lugar de entrega..."
                className="w-full"
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{errorMsg}</p>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" label="Cancelar" severity="secondary" outlined onClick={handleHide} />
          <Button
            type="submit"
            label={isEdit ? 'Guardar cambios' : 'Crear contacto'}
            icon="pi pi-check"
            loading={isPending}
            className="bg-[#1b3a5f] text-white border-[#1b3a5f]"
          />
        </div>
      </form>
    </Dialog>
  );
}
