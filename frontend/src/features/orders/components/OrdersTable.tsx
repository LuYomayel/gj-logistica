import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { DataTable } from "primereact/datatable";
import type { DataTablePageEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { Button } from "primereact/button";
import { Skeleton } from "primereact/skeleton";
import { Tooltip } from "primereact/tooltip";
import { ordersApi, type OrderFilters } from "../api/ordersApi";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { CreateOrderDialog } from "./CreateOrderDialog";
import { ExportOrdersDialog } from "./ExportOrdersDialog";
import { useAuth } from "../../../shared/hooks/useAuth";
import { useTenants, canManageTenants } from "../../../shared/hooks/useTenants";
import type { Order } from "../../../shared/types";

const STATUS_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "Borrador", value: 0 },
  { label: "Validado", value: 1 },
  { label: "En Proceso", value: 2 },
  { label: "Despachado", value: 3 },
  { label: "Cancelado", value: -1 },
];

export function OrdersTable() {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const isSuperAdmin = canManageTenants(user?.userType);
  const [filters, setFilters] = useState<OrderFilters>({ page: 1, limit: 20 });
  const [refInput, setRefInput] = useState("");
  const [statusInput, setStatusInput] = useState<number | string>("");
  const [tenantInput, setTenantInput] = useState<number | null>(null);
  const [dateFromInput, setDateFromInput] = useState<Date | null>(null);
  const [dateToInput, setDateToInput] = useState<Date | null>(null);
  const [clientRefInput, setClientRefInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", filters],
    queryFn: () => ordersApi.list(filters),
  });

  const { data: tenants } = useTenants();
  const tenantOptions = [
    { label: "Todas", value: null },
    ...((tenants ?? []).map((t) => ({ label: t.name, value: t.id }))),
  ];

  const orders = data?.data ?? [];
  const total = data?.total ?? 0;

  const applyFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      ref: refInput || undefined,
      status: statusInput !== "" ? statusInput : undefined,
      tenantId: isSuperAdmin && tenantInput ? tenantInput : undefined,
      clientRef: clientRefInput || undefined,
      dateFrom: dateFromInput ? dateFromInput.toISOString().split("T")[0] : undefined,
      dateTo: dateToInput ? dateToInput.toISOString().split("T")[0] : undefined,
    });
  };

  const clearFilters = () => {
    setRefInput("");
    setStatusInput("");
    setTenantInput(null);
    setDateFromInput(null);
    setDateToInput(null);
    setClientRefInput("");
    setFilters({ page: 1, limit: 20 });
  };

  const onPage = (e: DataTablePageEvent) => {
    setFilters((prev) => ({
      ...prev,
      page: (e.page ?? 0) + 1,
      limit: e.rows ?? 20,
    }));
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("es-AR") : "-";

  if (isLoading) {
    return <Skeleton height="400px" />;
  }

  return (
    <>
      <CreateOrderDialog visible={showCreate} onHide={() => setShowCreate(false)} />
      <ExportOrdersDialog visible={showExport} onHide={() => setShowExport(false)} />

    <div className="flex flex-col gap-4">
      {/* Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1b3a5f]">Pedidos</h1>
          <p className="text-gray-500 text-sm">
            {total.toLocaleString("es-AR")} pedidos en total
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPermission('orders.export') && (
            <Button
              label="Exportar CSV"
              icon="pi pi-download"
              outlined
              severity="secondary"
              onClick={() => setShowExport(true)}
              className="px-4 py-2"
            />
          )}
          {hasPermission('orders.write') && (
            <Button
              label="Nueva Orden"
              icon="pi pi-plus"
              onClick={() => setShowCreate(true)}
              className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700 px-4 py-2"
            />
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-xs font-medium text-gray-600">Ref</label>
            <InputText
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              placeholder="SOyymm-nnnn"
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              className="text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[130px]">
            <label className="text-xs font-medium text-gray-600">Estado</label>
            <Dropdown
              value={statusInput}
              options={STATUS_OPTIONS}
              onChange={(e) => setStatusInput(e.value)}
              placeholder="Todos"
              className="text-sm"
            />
          </div>
          {isSuperAdmin && (
            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-xs font-medium text-gray-600">Organización</label>
              <Dropdown
                value={tenantInput}
                options={tenantOptions}
                onChange={(e) => setTenantInput(e.value)}
                placeholder="Todas"
                filter
                className="text-sm"
              />
            </div>
          )}
          <div className="flex flex-col gap-1 min-w-[130px]">
            <label className="text-xs font-medium text-gray-600">Ref cliente</label>
            <InputText
              value={clientRefInput}
              onChange={(e) => setClientRefInput(e.target.value)}
              placeholder="Ref. cliente"
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              className="text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[135px]">
            <label className="text-xs font-medium text-gray-600">Fecha desde</label>
            <Calendar
              value={dateFromInput}
              onChange={(e) => setDateFromInput(e.value ?? null)}
              dateFormat="dd/mm/yy"
              showIcon
              className="text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[135px]">
            <label className="text-xs font-medium text-gray-600">Fecha hasta</label>
            <Calendar
              value={dateToInput}
              onChange={(e) => setDateToInput(e.value ?? null)}
              dateFormat="dd/mm/yy"
              showIcon
              className="text-sm"
            />
          </div>
          <Button
            label="Buscar"
            icon="pi pi-search"
            onClick={applyFilters}
            className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700 px-4 py-2"
          />
          <Button
            label="Limpiar"
            icon="pi pi-times"
            onClick={clearFilters}
            outlined
            severity="secondary"
            className="px-4 py-2"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <DataTable
          value={orders}
          lazy
          paginator
          scrollable
          rows={filters.limit ?? 20}
          totalRecords={total}
          first={((filters.page ?? 1) - 1) * (filters.limit ?? 20)}
          onPage={onPage}
          rowsPerPageOptions={[10, 20, 50]}
          size="small"
          emptyMessage="No se encontraron pedidos"
          rowClassName={() =>
            "cursor-pointer hover:bg-blue-50 transition-colors"
          }
          onRowClick={(e) => navigate(`/orders/${(e.data as Order).id}`)}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        >
          <Column
            field="ref"
            header="Ref"
            style={{ width: "140px", fontFamily: "monospace" }}
          />
          <Column
            field="clientRef"
            header="Ref cliente"
            style={{ width: "120px" }}
            body={(row: Order) => row.clientRef ?? "-"}
          />
          {isSuperAdmin && (
            <Column
              field="tenant.name"
              header="Organización"
              body={(row: Order) => row.tenant?.name ?? `#${row.entity}`}
            />
          )}
          <Column
            field="orderDate"
            header="Fecha"
            style={{ width: "100px" }}
            body={(row: Order) => formatDate(row.orderDate)}
          />
          <Column
            field="deliveryDate"
            header="F. prevista"
            style={{ width: "100px" }}
            body={(row: Order) => formatDate(row.deliveryDate)}
          />
          <Column
            field="status"
            header="Estado"
            style={{ width: "130px" }}
            body={(row: Order) => <StatusBadge status={row.status} />}
          />
          <Column
            field="createdBy"
            header="Autor"
            style={{ width: "120px" }}
            body={(row: Order) =>
              row.createdBy
                ? `${row.createdBy.firstName ?? ""} ${row.createdBy.lastName ?? ""}`.trim() ||
                  row.createdBy.username
                : "-"
            }
          />
          <Column
            header=""
            style={{ width: "50px", textAlign: "center" }}
            bodyStyle={{ textAlign: "center" }}
            body={(row: Order) => {
              if (row.status < 1) return null;
              return (
                <>
                  <Tooltip target={`.pdf-btn-${row.id}`} content="Descargar PDF" position="left" />
                  <Button
                    icon="pi pi-file-pdf"
                    text
                    size="small"
                    className={`pdf-btn-${row.id} text-gray-500 hover:text-blue-600 p-1`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void ordersApi.downloadPdf(row.id, row.ref);
                    }}
                  />
                </>
              );
            }}
          />
        </DataTable>
      </div>
    </div>
    </>
  );
}
