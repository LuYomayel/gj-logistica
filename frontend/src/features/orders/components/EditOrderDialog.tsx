import { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, type CreateOrderPayload } from '../api/ordersApi';
import { warehousesApi } from '../../warehouses/api/warehousesApi';
import { apiErrMsg } from '../../../shared/utils/apiErrMsg';
import type { Order } from '../../../shared/types';

interface Props {
  visible: boolean;
  onHide: () => void;
  order: Order;
  onSaved?: () => void;
}

type FormValues = {
  clientRef: string;
  orderDate: Date | null;
  deliveryDate: Date | null;
  warehouseId: number | null;
  publicNote: string;
};

export function EditOrderDialog({ visible, onHide, order, onSaved }: Props) {
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState('');

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list(),
    enabled: visible,
  });

  const warehouseOptions = (warehousesData?.data ?? []).map((w) => ({
    label: w.name,
    value: w.id,
  }));

  const parseDate = (d: string | null): Date | null =>
    d ? new Date(d) : null;

  const { control, handleSubmit, reset, register } = useForm<FormValues>({
    defaultValues: {
      clientRef: order.clientRef ?? '',
      orderDate: parseDate(order.orderDate),
      deliveryDate: parseDate(order.deliveryDate),
      warehouseId: (order as Order & { warehouseId?: number }).warehouseId ?? null,
      publicNote: order.publicNote ?? '',
    },
  });

  useEffect(() => {
    if (visible) {
      reset({
        clientRef: order.clientRef ?? '',
        orderDate: parseDate(order.orderDate),
        deliveryDate: parseDate(order.deliveryDate),
        warehouseId: (order as Order & { warehouseId?: number }).warehouseId ?? null,
        publicNote: order.publicNote ?? '',
      });
      setErrorMsg('');
    }
  }, [visible, order, reset]);

  const mut = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: Partial<CreateOrderPayload> = {
        clientRef: values.clientRef || undefined,
        orderDate: values.orderDate ? values.orderDate.toISOString().split('T')[0] : undefined,
        deliveryDate: values.deliveryDate ? values.deliveryDate.toISOString().split('T')[0] : undefined,
        warehouseId: values.warehouseId ?? undefined,
        publicNote: values.publicNote || undefined,
      };
      return ordersApi.update(order.id, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['orders', order.id] });
      setErrorMsg('');
      onHide();
      onSaved?.();
    },
    onError: (err) => setErrorMsg(apiErrMsg(err, 'Error al actualizar el pedido')),
  });

  const handleHide = () => {
    setErrorMsg('');
    onHide();
  };

  return (
    <Dialog
      header={`Editar Pedido ${order.ref}`}
      visible={visible}
      onHide={handleHide}
      style={{ width: '600px' }}
      modal
      draggable={false}
    >
      <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="flex flex-col gap-5 pt-2">

        {/* Tercero (read-only) */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Tercero</label>
          <InputText
            value={order.thirdParty?.name ?? '-'}
            readOnly
            className="w-full bg-gray-50 text-gray-500"
          />
        </div>

        {/* Datos editables */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos del pedido</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Ref cliente</label>
              <InputText
                {...register('clientRef')}
                placeholder="Ref. del cliente"
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Almacén</label>
              <Controller
                name="warehouseId"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    value={field.value}
                    options={warehouseOptions}
                    onChange={(e) => field.onChange(e.value)}
                    placeholder="Seleccionar..."
                    showClear
                    className="w-full"
                  />
                )}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Fecha pedido</label>
              <Controller
                name="orderDate"
                control={control}
                render={({ field }) => (
                  <Calendar
                    value={field.value}
                    onChange={(e) => field.onChange(e.value ?? null)}
                    dateFormat="dd/mm/yy"
                    showIcon
                    className="w-full"
                  />
                )}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Fecha prevista</label>
              <Controller
                name="deliveryDate"
                control={control}
                render={({ field }) => (
                  <Calendar
                    value={field.value}
                    onChange={(e) => field.onChange(e.value ?? null)}
                    dateFormat="dd/mm/yy"
                    showIcon
                    className="w-full"
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Notas */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Nota pública</label>
          <InputTextarea
            {...register('publicNote')}
            rows={3}
            placeholder="Nota visible en el pedido..."
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
            label="Guardar cambios"
            icon="pi pi-check"
            loading={mut.isPending}
            className="bg-[#1b3a5f] text-white border-[#1b3a5f]"
          />
        </div>
      </form>
    </Dialog>
  );
}
