import { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, type CreateProductPayload } from '../api/productsApi';
import { apiErrMsg } from '../../../shared/utils/apiErrMsg';
import type { Product } from '../../../shared/types';

interface Props {
  visible: boolean;
  onHide: () => void;
  product: Product;
  onSaved?: () => void;
}

const NIVEL_OPTIONS = [
  { label: 'Económico', value: 'economico' },
  { label: 'Premium', value: 'premium' },
  { label: 'Estándar', value: 'estandar' },
];

const VENTA_OPTIONS = [
  { label: 'Para vender', value: 1 },
  { label: 'No para vender', value: 0 },
];

type FormValues = Omit<CreateProductPayload, 'price' | 'vatRate' | 'stockAlertThreshold' | 'desiredStock' | 'isSellable'> & {
  price: number | null;
  vatRate: number | null;
  stockAlertThreshold: number | null;
  desiredStock: number | null;
  isSellable: number;
};

export function EditProductDialog({ visible, onHide, product, onSaved }: Props) {
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState('');

  const { control, handleSubmit, reset, register, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      ref: product.ref,
      label: product.label ?? '',
      isSellable: product.isSellable,
      description: product.description ?? '',
      barcode: product.barcode ?? '',
      price: product.price ? parseFloat(product.price) : null,
      vatRate: product.vatRate ? parseFloat(product.vatRate) : null,
      stockAlertThreshold: product.stockAlertThreshold,
      desiredStock: product.desiredStock,
      posicion: product.posicion ?? '',
      color: product.color ?? '',
      nivelEconomico: product.nivelEconomico ?? '',
      marca: product.marca ?? '',
      subrubro: product.subrubro ?? '',
      rubro: product.rubro ?? '',
      talle: product.talle ?? '',
      keywords: product.keywords ?? '',
      eanInterno: product.eanInterno ?? '',
    },
  });

  // Reset form when dialog opens or product changes
  useEffect(() => {
    if (visible) {
      reset({
        ref: product.ref,
        label: product.label ?? '',
        isSellable: product.isSellable,
        description: product.description ?? '',
        barcode: product.barcode ?? '',
        price: product.price ? parseFloat(product.price) : null,
        vatRate: product.vatRate ? parseFloat(product.vatRate) : null,
        stockAlertThreshold: product.stockAlertThreshold,
        desiredStock: product.desiredStock,
        posicion: product.posicion ?? '',
        color: product.color ?? '',
        nivelEconomico: product.nivelEconomico ?? '',
        marca: product.marca ?? '',
        subrubro: product.subrubro ?? '',
        rubro: product.rubro ?? '',
        talle: product.talle ?? '',
        keywords: product.keywords ?? '',
        eanInterno: product.eanInterno ?? '',
      });
      setErrorMsg('');
    }
  }, [visible, product, reset]);

  const mut = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: Partial<CreateProductPayload> = {
        ref: values.ref,
        label: values.label || undefined,
        isSellable: values.isSellable,
        description: values.description || undefined,
        barcode: values.barcode || undefined,
        price: values.price ?? undefined,
        vatRate: values.vatRate ?? undefined,
        stockAlertThreshold: values.stockAlertThreshold ?? undefined,
        desiredStock: values.desiredStock ?? undefined,
        posicion: values.posicion || undefined,
        color: values.color || undefined,
        nivelEconomico: values.nivelEconomico || undefined,
        marca: values.marca || undefined,
        subrubro: values.subrubro || undefined,
        rubro: values.rubro || undefined,
        talle: values.talle || undefined,
        keywords: values.keywords || undefined,
        eanInterno: values.eanInterno || undefined,
      };
      return productsApi.update(product.id, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['products', product.id] });
      setErrorMsg('');
      onHide();
      onSaved?.();
    },
    onError: (err) => setErrorMsg(apiErrMsg(err, 'Error al actualizar el producto')),
  });

  const handleHide = () => {
    setErrorMsg('');
    onHide();
  };

  return (
    <Dialog
      header="Editar Producto"
      visible={visible}
      onHide={handleHide}
      style={{ width: '700px' }}
      modal
      draggable={false}
    >
      <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="flex flex-col gap-5 pt-2">

        {/* Datos básicos */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos básicos</p>
          <div className="grid grid-cols-2 gap-4">
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
              <label className="text-sm font-medium text-gray-700">Estado (Venta)</label>
              <Controller
                name="isSellable"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    value={field.value}
                    options={VENTA_OPTIONS}
                    onChange={(e) => field.onChange(e.value)}
                    className="w-full"
                  />
                )}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Etiqueta</label>
              <InputText {...register('label')} placeholder="Nombre del producto" className="w-full" />
            </div>
          </div>
        </div>

        {/* Precio y código */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Precio y código</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Código de barras</label>
              <InputText {...register('barcode')} placeholder="EAN, UPC..." className="w-full" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Precio neto ($)</label>
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    value={field.value}
                    onValueChange={(e) => field.onChange(e.value ?? null)}
                    mode="decimal"
                    minFractionDigits={2}
                    maxFractionDigits={8}
                    placeholder="0.00"
                    inputClassName="w-full"
                  />
                )}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">IVA (%)</label>
              <Controller
                name="vatRate"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    value={field.value}
                    onValueChange={(e) => field.onChange(e.value ?? null)}
                    mode="decimal"
                    minFractionDigits={0}
                    maxFractionDigits={2}
                    placeholder="21"
                    inputClassName="w-full"
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Stock */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Stock</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Stock límite para alertas</label>
              <Controller
                name="stockAlertThreshold"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    value={field.value}
                    onValueChange={(e) => field.onChange(e.value ?? null)}
                    placeholder="0"
                    inputClassName="w-full"
                  />
                )}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Stock deseado</label>
              <Controller
                name="desiredStock"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    value={field.value}
                    onValueChange={(e) => field.onChange(e.value ?? null)}
                    placeholder="0"
                    inputClassName="w-full"
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Clasificación */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Clasificación</p>
          <div className="grid grid-cols-3 gap-4">
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
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Posición</label>
              <InputText {...register('posicion')} placeholder="Ej: A1-B2" className="w-full" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Nivel económico</label>
              <Controller
                name="nivelEconomico"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    value={field.value}
                    options={NIVEL_OPTIONS}
                    onChange={(e) => field.onChange(e.value)}
                    placeholder="Seleccionar..."
                    showClear
                    className="w-full"
                  />
                )}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">EAN Interno</label>
              <InputText {...register('eanInterno')} placeholder="EAN interno..." className="w-full" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Keywords</label>
              <InputText {...register('keywords')} placeholder="Palabras clave..." className="w-full" />
            </div>
          </div>
        </div>

        {/* Descripción */}
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
