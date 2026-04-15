import { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { stockApi } from '../../stock/api/stockApi';
import { warehousesApi } from '../../warehouses/api/warehousesApi';
import { apiErrMsg } from '../../../shared/utils/apiErrMsg';
import type { Product, Warehouse } from '../../../shared/types';

interface Props {
  visible: boolean;
  onHide: () => void;
  onSaved?: () => void;
  product: Pick<Product, 'id' | 'ref' | 'label' | 'stock'>;
}

interface FormValues {
  warehouseId: number | null;
  quantity: number;
  label: string;
  inventoryCode: string;
}

export function AdjustProductStockDialog({ visible, onHide, onSaved, product }: Props) {
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState('');

  const { data: warehousesResp } = useQuery({
    queryKey: ['warehouses', 'all'],
    queryFn: () => warehousesApi.list(),
    enabled: visible,
  });
  const warehouses = (warehousesResp?.data ?? []).filter((w: Warehouse) => w.status === 1);

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: { warehouseId: null, quantity: 0, label: '', inventoryCode: '' },
  });

  // Autoseleccionar el único almacén si hay solo uno
  useEffect(() => {
    if (visible && warehouses.length === 1) {
      setValue('warehouseId', warehouses[0].id);
    }
  }, [visible, warehouses, setValue]);

  const mut = useMutation({
    mutationFn: (v: FormValues) =>
      stockApi.createMovement({
        warehouseId: v.warehouseId!,
        productId: product.id,
        quantity: v.quantity,
        label: v.label || undefined,
        inventoryCode: v.inventoryCode || undefined,
      }),
    onSuccess: (_, v) => {
      void queryClient.invalidateQueries({ queryKey: ['products', product.id] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      if (v.warehouseId) {
        void queryClient.invalidateQueries({ queryKey: ['warehouse-stock', v.warehouseId] });
        void queryClient.invalidateQueries({ queryKey: ['warehouse-movements', v.warehouseId] });
        void queryClient.invalidateQueries({ queryKey: ['warehouses', v.warehouseId] });
      }
      reset();
      setErrorMsg('');
      onSaved?.();
      onHide();
    },
    onError: (err) => setErrorMsg(apiErrMsg(err, 'Error al registrar el movimiento')),
  });

  const onSubmit = (values: FormValues) => {
    if (!values.warehouseId) { setErrorMsg('Seleccioná un almacén'); return; }
    setErrorMsg('');
    mut.mutate(values);
  };

  const handleHide = () => { reset(); setErrorMsg(''); onHide(); };

  return (
    <Dialog
      header={`Ajustar stock — ${product.ref}`}
      visible={visible}
      onHide={handleHide}
      style={{ width: '480px' }}
      breakpoints={{ '640px': '95vw', '575px': '100vw' }}
      modal
      draggable={false}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
        <div className="text-sm text-gray-600 -mt-1">
          Stock actual total: <span className={product.stock > 0 ? 'text-green-600 font-medium' : 'text-orange-500 font-medium'}>{product.stock}</span>
        </div>

        {/* Almacén */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Almacén <span className="text-red-400">*</span>
          </label>
          <Controller
            name="warehouseId"
            control={control}
            rules={{ required: 'El almacén es obligatorio' }}
            render={({ field }) => (
              <Dropdown
                value={field.value}
                options={warehouses}
                optionLabel="name"
                optionValue="id"
                onChange={(e) => field.onChange(e.value)}
                placeholder={warehouses.length === 0 ? 'No hay almacenes activos' : 'Seleccionar almacén...'}
                disabled={warehouses.length === 0}
                className={`w-full ${errors.warehouseId ? 'p-invalid' : ''}`}
                emptyMessage="Sin almacenes"
              />
            )}
          />
          {errors.warehouseId && <small className="text-red-500">{errors.warehouseId.message}</small>}
        </div>

        {/* Cantidad */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Cantidad <span className="text-red-400">*</span>
            <span className="ml-1 text-xs text-gray-400 font-normal">(positivo = entrada, negativo = salida)</span>
          </label>
          <Controller
            name="quantity"
            control={control}
            rules={{ required: 'La cantidad es obligatoria', validate: v => v !== 0 || 'La cantidad no puede ser cero' }}
            render={({ field }) => (
              <InputNumber
                value={field.value}
                onValueChange={(e) => field.onChange(e.value ?? 0)}
                showButtons
                buttonLayout="horizontal"
                decrementButtonClassName="p-button-secondary p-button-outlined"
                incrementButtonClassName="p-button-secondary p-button-outlined"
                incrementButtonIcon="pi pi-plus"
                decrementButtonIcon="pi pi-minus"
                inputClassName={`text-center w-full ${errors.quantity ? 'p-invalid' : ''}`}
              />
            )}
          />
          {errors.quantity && <small className="text-red-500">{errors.quantity.message}</small>}
        </div>

        {/* Etiqueta */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Descripción del movimiento</label>
          <Controller
            name="label"
            control={control}
            render={({ field }) => (
              <InputText {...field} className="w-full" placeholder="Ej: Recepción de mercadería, Ajuste de inventario..." />
            )}
          />
        </div>

        {/* Código inventario */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Código de referencia (opcional)</label>
          <Controller
            name="inventoryCode"
            control={control}
            render={({ field }) => (
              <InputText {...field} className="w-full" placeholder="Ej: REM-001, INV-2026-03" />
            )}
          />
        </div>

        {errorMsg && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{errorMsg}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" label="Cancelar" severity="secondary" outlined onClick={handleHide} />
          <Button
            type="submit"
            label="Registrar movimiento"
            icon="pi pi-check"
            loading={mut.isPending}
            disabled={warehouses.length === 0}
            className="bg-[#1b3a5f] text-white border-[#1b3a5f]"
          />
        </div>
      </form>
    </Dialog>
  );
}
