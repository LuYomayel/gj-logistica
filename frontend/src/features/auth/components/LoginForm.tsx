import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { useState } from 'react';
import { authApi } from '../api/authApi';
import { useAuth } from '../../../shared/hooks/useAuth';
import { apiErrMsg } from '../../../shared/utils/apiErrMsg';

interface LoginFormData {
  username: string;
  password: string;
}

export function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ defaultValues: { username: '', password: '' } });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      const res = await authApi.login(data.username, data.password);
      login(res.access_token, res.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(apiErrMsg(err, 'Usuario o contraseña incorrectos'));
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#1b3a5f] to-[#2a5298]">
      <Card className="w-full max-w-md shadow-2xl border-0">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <i className="pi pi-box text-3xl text-[#1b3a5f]" />
            <span className="text-3xl font-bold text-[#1b3a5f]">GJ Logística</span>
          </div>
          <p className="text-gray-500 text-sm">Ingresá con tus credenciales</p>
        </div>

        {error && (
          <div className="mb-4">
            <Message severity="error" text={error} className="w-full" />
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="username" className="text-sm font-medium text-gray-700">
              Usuario
            </label>
            <Controller
              name="username"
              control={control}
              rules={{ required: 'El usuario es requerido' }}
              render={({ field }) => (
                <InputText
                  id="username"
                  {...field}
                  placeholder="Ingresá tu usuario"
                  className={`w-full ${errors.username ? 'p-invalid' : ''}`}
                  autoComplete="username"
                />
              )}
            />
            {errors.username && (
              <small className="text-red-500">{errors.username.message}</small>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <Controller
              name="password"
              control={control}
              rules={{ required: 'La contraseña es requerida' }}
              render={({ field }) => (
                <Password
                  id="password"
                  {...field}
                  placeholder="Ingresá tu contraseña"
                  className={`w-full ${errors.password ? 'p-invalid' : ''}`}
                  feedback={false}
                  toggleMask
                  inputClassName="w-full"
                  autoComplete="current-password"
                />
              )}
            />
            {errors.password && (
              <small className="text-red-500">{errors.password.message}</small>
            )}
          </div>

          <Button
            type="submit"
            label="Ingresar"
            icon="pi pi-sign-in"
            loading={isSubmitting}
            className="w-full mt-2 bg-blue-600 text-white border-blue-600 hover:bg-blue-700 py-3 text-base font-semibold"
          />
        </form>
      </Card>
    </div>
  );
}
