import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { AutoComplete } from 'primereact/autocomplete';
import type { AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { stockApi } from '../../stock/api/stockApi';
import { productsApi } from '../../products/api/productsApi';
import { apiErrMsg } from '../../../shared/utils/apiErrMsg';
import type { Product } from '../../../shared/types';

interface Props {
  visible: boolean;
  onHide: () => void;
  warehouseId: number;
  /** Producto pre-seleccionado (desde fila de stock) */
  preselectedProduct?: { id: number; ref: string; label: string | null };
}

interface FormValues {
  quantity: number;
  label: string;
  inventoryCode: string;
}

export function StockCorrectionDialog({ visible, onHide, warehouseId, preselectedProduct }: Props) {
  const queryClient = useQueryClient();

  const [productInput, setProductInput] = useState<string | Product>(
    preselectedProduct ? ({ id: preselectedProduct.id, ref: preselectedProduct.ref, label: preselectedProduct.label } as unknown as Product) : ''
  );
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync productInput when preselectedProduct changes (user re-opens dialog for different product)
  useEffect(() => {
    if (preselectedProduct) {
      setProductInput({ id: preselectedProduct.id, ref: preselectedProduct.ref, label: preselectedProduct.label } as unknown as Product);
    } else {
      setProductInput('');
    }
  }, [preselectedProduct?.id]);

  const selectedProduct: Product | null =
    productInput !== '' && typeof productInput !== 'string' ? (productInput as Product) : null;

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { quantity: 0, label: '', inventoryCode: '' },
  });

  const searchProducts = async (event: AutoCompleteCompleteEvent) => {
    const q = event.query.trim();
    if (q.length < 1) { setSuggestions([]); return; }
    try {
      const res = await productsApi.list({ search: q, limit: 30 });
      setSuggestions(res.data);
    } catch { setSuggestions([]); }
  };

  const mut = useMutation({
    mutationFn: (values: FormValues) =>
      stockApi.createMovement({
        warehouseId,
        productId: selectedProduct!.id,
        quantity: values.quantity,
        label: values.label || undefined,
        inventoryCode: values.inventoryCode || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['warehouse-stock', warehouseId] });
      void queryClient.invalidateQueries({ queryKey: ['warehouse-movements', warehouseId] });
      void queryClient.invalidateQueries({ queryKey: ['warehouses', warehouseId] });
      reset();
      setProductInput('');
      setErrorMsg('');
      onHide();
    },
    onError: (err) => setErrorMsg(apiErrMsg(err, 'Error al crear el movimiento')),
  });

  const onSubmit = (values: FormValues) => {
    if (!selectedProduct) { setErrorMsg('Seleccioná un producto'); return; }
    setErrorMsg('');
    mut.mutate(values);
  };

  const handleHide = () => {
    reset();
    if (!preselectedProduct) setProductInput('');
    setErrorMsg('');
    onHide();
  };

  const productItemTemplate = (p: Product) => (
    <div className="flex items-center gap-2 py-0.5">
      <span className="font-mono text-xs text-gray-500">{p.ref}</span>
      <span className="text-sm truncate">{p.label}</span>
      <span className={`ml-auto text-xs ${p.stock > 0 ? 'text-green-600' : 'text-orange-500'}`}>
        Stock: {p.stock}
      </span>
    </div>
  );

  return (
    <Dialog
      header="Corrección de Stock"
      visible={visible}
      onHide={handleHide}
      style={{ width: '480px' }}
      breakpoints={{ '640px': '95vw', '575px': '100vw' }}
      modal
      draggable={false}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">

        {/* Producto */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Producto <span className="text-red-400">*</span>
          </label>
          <AutoComplete
            value={productInput}
            field="label"
            suggestions={suggestions}
            completeMethod={searchProducts}
            itemTemplate={productItemTemplate}
            selectedItemTemplate={(p: Product) => `${p.ref} — ${p.label ?? ''}`}
            onChange={(e) => setProductInput(e.value as string | Product)}
            placeholder="Buscar por ref o nombre..."
            minLength={1}
            delay={200}
            disabled={!!preselectedProduct}
            className="w-full text-sm"
            inputClassName="w-full text-sm"
          />
          {selectedProduct && (
            <small className="text-gray-500">
              Stock actual: <span className={selectedProduct.stock > 0 ? 'text-green-600 font-medium' : 'text-orange-500 font-medium'}>{selectedProduct.stock}</span>
            </small>
          )}
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
            className="bg-[#1b3a5f] text-white border-[#1b3a5f]"
          />
        </div>
      </form>
    </Dialog>
  );
}
