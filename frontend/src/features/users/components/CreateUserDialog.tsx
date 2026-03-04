import { useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi, type CreateUserDto } from '../api/usersApi';
import { tenantsApi } from '../../admin/api/tenantsApi';
import { useAuth } from '../../../shared/hooks/useAuth';
import type { UserType } from '../../../shared/types';

interface Props {
  visible: boolean;
  onHide: () => void;
  /** If provided, user is created in this tenant (field locked) */
  tenantId?: number;
  /** Callback after successful creation */
  onCreated?: () => void;
}

interface FormData {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  userType: UserType;
  entity: number | null;
}

const USER_TYPE_OPTIONS_SUPER: { label: string; value: UserType }[] = [
  { label: 'Admin de tenant', value: 'client_admin' },
  { label: 'Usuario estándar', value: 'client_user' },
  { label: 'Super administrador', value: 'super_admin' },
];

const USER_TYPE_OPTIONS_ADMIN: { label: string; value: UserType }[] = [
  { label: 'Usuario estándar', value: 'client_user' },
];

export function CreateUserDialog({ visible, onHide, tenantId, onCreated }: Props) {
  const toast = useRef<Toast>(null);
  const qc = useQueryClient();
  const { isSuperAdmin, isClientAdmin, user: authUser } = useAuth();
  // client_admin: tenant is always their own, userType is always client_user
  const isFixedTenant = tenantId !== undefined || isClientAdmin;
  const effectiveTenantId = tenantId ?? (isClientAdmin ? (authUser?.tenantId ?? undefined) : undefined);
  const userTypeOptions = isSuperAdmin ? USER_TYPE_OPTIONS_SUPER : USER_TYPE_OPTIONS_ADMIN;

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      userType: 'client_user',
      entity: tenantId ?? null,
    },
  });

  // Load tenants list (only needed when tenant is not fixed)
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: tenantsApi.list,
    enabled: visible && !isFixedTenant,
  });

  useEffect(() => {
    if (visible) {
      reset({
        username: '',
        password: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        userType: 'client_user',
        entity: effectiveTenantId ?? null,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const dto: CreateUserDto = {
        username: data.username,
        password: data.password,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        userType: data.userType,
        entity: data.entity ?? undefined,
      };
      return usersApi.create(dto);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      void qc.invalidateQueries({ queryKey: ['tenants'] });
      toast.current?.show({ severity: 'success', summary: 'Usuario creado', detail: 'El usuario fue creado correctamente', life: 3000 });
      onCreated?.();
      onHide();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      const msg = err?.response?.data?.message ?? 'No se pudo crear el usuario';
      toast.current?.show({ severity: 'error', summary: 'Error', detail: msg, life: 5000 });
    },
  });

  const footer = (
    <div className="flex justify-end gap-2">
      <Button label="Cancelar" outlined severity="secondary" onClick={onHide} />
      <Button
        label="Crear usuario"
        icon="pi pi-user-plus"
        loading={mutation.isPending}
        onClick={() => void handleSubmit((d) => mutation.mutate(d))()}
      />
    </div>
  );

  return (
    <>
      <Toast ref={toast} />
      <Dialog
        header="Nuevo Usuario"
        visible={visible}
        onHide={onHide}
        footer={footer}
        style={{ width: '480px' }}
      >
        <div className="flex flex-col gap-4 mt-2">
          {/* Username */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Usuario (login) *</label>
            <Controller
              name="username"
              control={control}
              rules={{ required: 'Requerido', minLength: { value: 3, message: 'Mínimo 3 caracteres' } }}
              render={({ field }) => (
                <InputText {...field} className={`w-full ${errors.username ? 'p-invalid' : ''}`} placeholder="Ej: jperez" />
              )}
            />
            {errors.username && <small className="text-red-500">{errors.username.message}</small>}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Contraseña *</label>
            <Controller
              name="password"
              control={control}
              rules={{ required: 'Requerido', minLength: { value: 6, message: 'Mínimo 6 caracteres' } }}
              render={({ field }) => (
                <Password
                  {...field}
                  className="w-full"
                  inputClassName={`w-full ${errors.password ? 'p-invalid' : ''}`}
                  placeholder="Contraseña segura"
                  feedback={false}
                  toggleMask
                />
              )}
            />
            {errors.password && <small className="text-red-500">{errors.password.message}</small>}
          </div>

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Nombre</label>
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => <InputText {...field} className="w-full" placeholder="Juan" />}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Apellido</label>
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => <InputText {...field} className="w-full" placeholder="Pérez" />}
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <Controller
              name="email"
              control={control}
              rules={{ pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' } }}
              render={({ field }) => (
                <InputText {...field} type="email" className={`w-full ${errors.email ? 'p-invalid' : ''}`} placeholder="jperez@empresa.com" />
              )}
            />
            {errors.email && <small className="text-red-500">{errors.email.message}</small>}
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Teléfono</label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => <InputText {...field} className="w-full" placeholder="+54 11 1234-5678" />}
            />
          </div>

          {/* User type — hidden for client_admin (always client_user) */}
          {isSuperAdmin && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Tipo de usuario *</label>
              <Controller
                name="userType"
                control={control}
                rules={{ required: 'Requerido' }}
                render={({ field }) => (
                  <Dropdown
                    {...field}
                    options={userTypeOptions}
                    optionLabel="label"
                    optionValue="value"
                    className={`w-full ${errors.userType ? 'p-invalid' : ''}`}
                    placeholder="Seleccionar tipo"
                  />
                )}
              />
              {errors.userType && <small className="text-red-500">{errors.userType.message}</small>}
            </div>
          )}

          {/* Tenant — fixed or selectable (client_admin always sees their own tenant) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Tenant *</label>
            {isFixedTenant ? (
              <InputText value={`Tenant #${effectiveTenantId}`} disabled className="w-full bg-gray-50" />
            ) : (
              <Controller
                name="entity"
                control={control}
                rules={{ required: 'Seleccione un tenant' }}
                render={({ field }) => (
                  <Dropdown
                    value={field.value}
                    onChange={(e) => field.onChange(e.value as number)}
                    options={tenants.map((t) => ({ label: `${t.name} (${t.code})`, value: t.id }))}
                    optionLabel="label"
                    optionValue="value"
                    className={`w-full ${errors.entity ? 'p-invalid' : ''}`}
                    placeholder="Seleccionar tenant"
                    filter
                  />
                )}
              />
            )}
            {errors.entity && <small className="text-red-500">{(errors.entity as { message?: string }).message}</small>}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            <strong>El usuario podrá iniciar sesión</strong> con el nombre de usuario y contraseña indicados.
            Si necesita cambiar su contraseña, puede hacerlo desde su perfil o un admin puede editarla.
          </div>
        </div>
      </Dialog>
    </>
  );
}
