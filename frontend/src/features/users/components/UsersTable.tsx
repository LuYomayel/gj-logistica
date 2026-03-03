import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import type { DataTablePageEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { usersApi } from '../api/usersApi';
import type { User } from '../../../shared/types';

export function UsersTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, limit }],
    queryFn: () => usersApi.list({ page, limit }),
  });

  const users = data?.data ?? [];
  const total = data?.total ?? 0;

  const onPage = (e: DataTablePageEvent) => {
    setPage((e.page ?? 0) + 1);
    setLimit(e.rows ?? 50);
  };

  if (isLoading) {
    return <Skeleton height="400px" />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-[#1b3a5f]">Usuarios y Grupos</h1>
        <p className="text-gray-500 text-sm">{total} usuarios en total</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <DataTable
          value={users}
          lazy
          paginator
          rows={limit}
          totalRecords={total}
          first={(page - 1) * limit}
          onPage={onPage}
          rowsPerPageOptions={[10, 50, 100]}
          size="small"
          emptyMessage="No se encontraron usuarios"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        >
          <Column
            field="lastName"
            header="Apellido"
            style={{ width: '150px' }}
            body={(row: User) => row.lastName ?? '-'}
          />
          <Column
            field="firstName"
            header="Nombre"
            style={{ width: '150px' }}
            body={(row: User) => row.firstName ?? '-'}
          />
          <Column field="username" header="Usuario" style={{ width: '150px' }} />
          <Column
            field="email"
            header="Email"
            body={(row: User) =>
              row.email ? (
                <a href={`mailto:${row.email}`} className="text-blue-600 hover:underline">
                  {row.email}
                </a>
              ) : (
                '-'
              )
            }
          />
          <Column
            field="phone"
            header="Teléfono"
            style={{ width: '140px' }}
            body={(row: User) => row.phone ?? '-'}
          />
          <Column
            field="isAdmin"
            header="Admin"
            style={{ width: '80px', textAlign: 'center' }}
            bodyStyle={{ textAlign: 'center' }}
            body={(row: User) =>
              row.isAdmin ? (
                <Tag value="Admin" severity="warning" />
              ) : (
                <span className="text-gray-400 text-xs">—</span>
              )
            }
          />
          <Column
            field="status"
            header="Estado"
            style={{ width: '100px', textAlign: 'center' }}
            bodyStyle={{ textAlign: 'center' }}
            body={(row: User) => (
              <Tag
                value={row.status === 1 ? 'Activo' : 'Inactivo'}
                severity={row.status === 1 ? 'success' : 'danger'}
              />
            )}
          />
          <Column
            field="groups"
            header="Grupos"
            body={(row: User) =>
              row.groups?.length ? row.groups.map((g) => g.name).join(', ') : '-'
            }
          />
        </DataTable>
      </div>
    </div>
  );
}
