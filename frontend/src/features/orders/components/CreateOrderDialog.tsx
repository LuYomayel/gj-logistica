import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { InputTextarea } from "primereact/inputtextarea";
import { Toast } from "primereact/toast";
import { ordersApi, type CreateOrderPayload } from "../api/ordersApi";
import { thirdPartiesApi } from "../../third-parties/api/thirdPartiesApi";
import { warehousesApi } from "../../warehouses/api/warehousesApi";

interface Props {
  visible: boolean;
  onHide: () => void;
}

interface FormValues {
  thirdPartyId: number | null;
  warehouseId: number | null;
  clientRef: string;
  orderDate: Date | null;
  deliveryDate: Date | null;
  nroSeguimiento: string;
  agencia: string;
  publicNote: string;
}

export function CreateOrderDialog({ visible, onHide }: Props) {
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      thirdPartyId: null,
      warehouseId: null,
      clientRef: "",
      orderDate: new Date(),
      deliveryDate: null,
      nroSeguimiento: "",
      agencia: "",
      publicNote: "",
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (visible) {
      reset({
        thirdPartyId: null,
        warehouseId: null,
        clientRef: "",
        orderDate: new Date(),
        deliveryDate: null,
        nroSeguimiento: "",
        agencia: "",
        publicNote: "",
      });
    }
  }, [visible, reset]);

  // Load third parties
  const { data: tpData } = useQuery({
    queryKey: ["third-parties", "all"],
    queryFn: () => thirdPartiesApi.list({ limit: 200 }),
    enabled: visible,
  });

  // Load warehouses
  const { data: whData } = useQuery({
    queryKey: ["warehouses", "all"],
    queryFn: () => warehousesApi.list(),
    enabled: visible,
  });

  const thirdPartyOptions = (tpData?.data ?? []).map((tp) => ({
    label: tp.name,
    value: tp.id,
  }));

  const warehouseOptions = [
    { label: "— Sin almacén —", value: null },
    ...(whData?.data ?? []).map((wh) => ({
      label: wh.name,
      value: wh.id,
    })),
  ];

  const createMut = useMutation({
    mutationFn: (payload: CreateOrderPayload) => ordersApi.create(payload),
    onSuccess: (order) => {
      toast.current?.show({
        severity: "success",
        summary: "Pedido creado",
        detail: `Borrador ${order.ref}`,
        life: 2000,
      });
      onHide();
      navigate(`/orders/${order.id}`);
    },
    onError: () => {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo crear el pedido",
        life: 4000,
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!values.thirdPartyId) return;

    const payload: CreateOrderPayload = {
      thirdPartyId: values.thirdPartyId,
      warehouseId: values.warehouseId ?? undefined,
      clientRef: values.clientRef || undefined,
      orderDate: values.orderDate ? values.orderDate.toISOString() : undefined,
      deliveryDate: values.deliveryDate
        ? values.deliveryDate.toISOString()
        : undefined,
      nroSeguimiento: values.nroSeguimiento || undefined,
      agencia: values.agencia || undefined,
      publicNote: values.publicNote || undefined,
    };

    createMut.mutate(payload);
  };

  const footer = (
    <div className="flex justify-end gap-2 pt-2">
      <Button
        label="Cancelar"
        icon="pi pi-times"
        outlined
        severity="secondary"
        onClick={onHide}
        disabled={createMut.isPending}
      />
      <Button
        label="Crear borrador"
        icon="pi pi-plus"
        loading={createMut.isPending}
        onClick={() => void handleSubmit(onSubmit)()}
        className=""
      />
    </div>
  );

  return (
    <>
      <Toast ref={toast} />
      <Dialog
        header="Nueva Orden"
        visible={visible}
        onHide={onHide}
        style={{ width: "560px" }}
        breakpoints={{ "768px": "95vw", "575px": "100vw" }}
        footer={footer}
        modal
        draggable={false}
      >
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-4 pt-2"
        >
          {/* Cliente (required) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Cliente <span className="text-red-500">*</span>
            </label>
            <Controller
              name="thirdPartyId"
              control={control}
              rules={{ required: "El cliente es obligatorio" }}
              render={({ field }) => (
                <Dropdown
                  {...field}
                  options={thirdPartyOptions}
                  filter
                  filterPlaceholder="Buscar cliente..."
                  placeholder="Seleccionar cliente"
                  className={`w-full text-sm ${errors.thirdPartyId ? "p-invalid" : ""}`}
                />
              )}
            />
            {errors.thirdPartyId && (
              <span className="text-xs text-red-500">
                {errors.thirdPartyId.message}
              </span>
            )}
          </div>

          {/* Ref. cliente */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Ref. cliente
            </label>
            <Controller
              name="clientRef"
              control={control}
              render={({ field }) => (
                <InputText
                  {...field}
                  placeholder="Ej: Virginia Barbuy"
                  className="w-full text-sm"
                />
              )}
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Fecha pedido
              </label>
              <Controller
                name="orderDate"
                control={control}
                render={({ field }) => (
                  <Calendar
                    value={field.value}
                    onChange={(e) => field.onChange(e.value)}
                    dateFormat="dd/mm/yy"
                    showIcon
                    placeholder="dd/mm/aaaa"
                    className="w-full text-sm"
                  />
                )}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                F. prevista entrega
              </label>
              <Controller
                name="deliveryDate"
                control={control}
                render={({ field }) => (
                  <Calendar
                    value={field.value}
                    onChange={(e) => field.onChange(e.value)}
                    dateFormat="dd/mm/yy"
                    showIcon
                    placeholder="dd/mm/aaaa"
                    className="w-full text-sm"
                  />
                )}
              />
            </div>
          </div>

          {/* Almacén */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Almacén</label>
            <Controller
              name="warehouseId"
              control={control}
              render={({ field }) => (
                <Dropdown
                  {...field}
                  options={warehouseOptions}
                  placeholder="Sin almacén"
                  className="w-full text-sm"
                />
              )}
            />
          </div>

          {/* Nro seguimiento + Agencia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Nro. seguimiento
              </label>
              <Controller
                name="nroSeguimiento"
                control={control}
                render={({ field }) => (
                  <InputText
                    {...field}
                    placeholder="Ej: 12345"
                    className="w-full text-sm"
                  />
                )}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Agencia
              </label>
              <Controller
                name="agencia"
                control={control}
                render={({ field }) => (
                  <InputText
                    {...field}
                    placeholder="Ej: OCA"
                    className="w-full text-sm"
                  />
                )}
              />
            </div>
          </div>

          {/* Nota pública */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Nota pública
            </label>
            <Controller
              name="publicNote"
              control={control}
              render={({ field }) => (
                <InputTextarea
                  {...field}
                  rows={3}
                  placeholder="Notas visibles en el documento..."
                  className="w-full text-sm"
                />
              )}
            />
          </div>
        </form>
      </Dialog>
    </>
  );
}
