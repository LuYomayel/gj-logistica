import { useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Dialog } from 'primereact/dialog';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useMutation } from '@tanstack/react-query';
import { usersApi } from '../api/usersApi';
import { apiErrMsg } from '../../../shared/utils/apiErrMsg';
import type { User } from '../../../shared/types';

interface Props {
  visible: boolean;
  onHide: () => void;
  /** User whose password is being changed */
  targetUser: User | null;
  /** True when the logged-in user is changing their own password */
  isSelf: boolean;
}

interface FormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ChangePasswordDialog({ visible, onHide, targetUser, isSelf }: Props) {
  const toast = useRef<Toast>(null);

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (visible) reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
  }, [visible, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      usersApi.changePassword(targetUser!.id, {
        currentPassword: isSelf ? data.currentPassword : undefined,
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      toast.current?.show({
        severity: 'success',
        summary: 'Contraseña actualizada',
        detail: 'La contraseña fue cambiada correctamente',
        life: 3000,
      });
      onHide();
    },
    onError: (err) => {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: apiErrMsg(err, 'No se pudo cambiar la contraseña'), life: 5000 });
    },
  });

  const footer = (
    <div className="flex justify-end gap-2">
      <Button label="Cancelar" outlined severity="secondary" onClick={onHide} />
      <Button
        label="Guardar contraseña"
        icon="pi pi-lock"
        loading={mutation.isPending}
        onClick={() => void handleSubmit((d) => mutation.mutate(d))()}
      />
    </div>
  );

  const userName = targetUser
    ? `${targetUser.firstName ?? ''} ${targetUser.lastName ?? targetUser.username}`.trim() || targetUser.username
    : '';

  return (
    <>
      <Toast ref={toast} />
      <Dialog
        header={isSelf ? 'Cambiar mi contraseña' : `Cambiar contraseña de ${userName}`}
        visible={visible}
        onHide={onHide}
        footer={footer}
        style={{ width: '420px' }}
        breakpoints={{ '640px': '95vw', '575px': '100vw' }}
      >
        <div className="flex flex-col gap-4 mt-2">
          {/* Current password — only required when changing own password */}
          {isSelf && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Contraseña actual *</label>
              <Controller
                name="currentPassword"
                control={control}
                rules={{ required: 'Requerida para cambiar tu propia contraseña' }}
                render={({ field }) => (
                  <Password
                    {...field}
                    className="w-full"
                    inputClassName={`w-full ${errors.currentPassword ? 'p-invalid' : ''}`}
                    placeholder="Tu contraseña actual"
                    feedback={false}
                    toggleMask
                  />
                )}
              />
              {errors.currentPassword && (
                <small className="text-red-500">{errors.currentPassword.message}</small>
              )}
            </div>
          )}

          {/* New password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Nueva contraseña *</label>
            <Controller
              name="newPassword"
              control={control}
              rules={{
                required: 'Requerida',
                minLength: { value: 6, message: 'Mínimo 6 caracteres' },
              }}
              render={({ field }) => (
                <Password
                  {...field}
                  className="w-full"
                  inputClassName={`w-full ${errors.newPassword ? 'p-invalid' : ''}`}
                  placeholder="Nueva contraseña segura"
                  feedback={false}
                  toggleMask
                />
              )}
            />
            {errors.newPassword && (
              <small className="text-red-500">{errors.newPassword.message}</small>
            )}
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Confirmar contraseña *</label>
            <Controller
              name="confirmPassword"
              control={control}
              rules={{
                required: 'Requerida',
                validate: (val) =>
                  val === watch('newPassword') || 'Las contraseñas no coinciden',
              }}
              render={({ field }) => (
                <Password
                  {...field}
                  className="w-full"
                  inputClassName={`w-full ${errors.confirmPassword ? 'p-invalid' : ''}`}
                  placeholder="Repetir nueva contraseña"
                  feedback={false}
                  toggleMask
                />
              )}
            />
            {errors.confirmPassword && (
              <small className="text-red-500">{errors.confirmPassword.message}</small>
            )}
          </div>

          {!isSelf && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              <strong>Acción de administrador:</strong> estás cambiando la contraseña de otro usuario.
              No se requiere la contraseña actual.
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
