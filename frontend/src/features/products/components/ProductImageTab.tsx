import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from 'primereact/button';
import { FileUpload, type FileUploadHandlerEvent } from 'primereact/fileupload';
import { Toast } from 'primereact/toast';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { productsApi } from '../api/productsApi';
import { AuthImage } from '../../../shared/components/AuthImage';
import { useAuth } from '../../../shared/hooks/useAuth';
import { apiErrMsg } from '../../../shared/utils/apiErrMsg';

interface Props {
  productId: number;
}

export function ProductImageTab({ productId }: Props) {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('products.write');
  const toast = useRef<Toast>(null);
  const fileUpload = useRef<FileUpload>(null);
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const uploadMut = useMutation({
    mutationFn: (file: File) => productsApi.uploadImage(productId, file),
    onSuccess: () => {
      toast.current?.show({ severity: 'success', summary: 'Imagen subida', life: 3000 });
      void queryClient.invalidateQueries({ queryKey: ['products', productId] });
      void queryClient.invalidateQueries({ queryKey: ['products', productId, 'image'] });
      fileUpload.current?.clear();
    },
    onError: (err) => {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: apiErrMsg(err, 'No se pudo subir la imagen'), life: 4000 });
    },
    onSettled: () => setUploading(false),
  });

  const deleteMut = useMutation({
    mutationFn: () => productsApi.deleteImage(productId),
    onSuccess: () => {
      toast.current?.show({ severity: 'success', summary: 'Imagen eliminada', life: 3000 });
      void queryClient.invalidateQueries({ queryKey: ['products', productId] });
      void queryClient.invalidateQueries({ queryKey: ['products', productId, 'image'] });
    },
    onError: (err) => {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: apiErrMsg(err, 'No se pudo eliminar la imagen'), life: 4000 });
    },
  });

  const handleUpload = (e: FileUploadHandlerEvent) => {
    const file = e.files?.[0];
    if (!file) return;
    setUploading(true);
    uploadMut.mutate(file);
  };

  const handleDelete = () => {
    confirmDialog({
      message: '¿Eliminar la imagen del producto?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'bg-red-600 text-white border-red-600',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => deleteMut.mutate(),
    });
  };

  // Cache-buster so that AuthImage reloads after upload/delete.
  const cacheKey = `${uploadMut.isSuccess ? uploadMut.submittedAt : 0}-${deleteMut.isSuccess ? deleteMut.submittedAt : 0}`;
  const imagePath = productsApi.imagePath(productId, false);

  return (
    <div className="p-2 flex flex-col gap-6">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Imagen actual
        </h3>
        <div className="flex items-start gap-4">
          <div className="w-[240px] h-[240px] border border-gray-200 rounded flex items-center justify-center bg-gray-50 overflow-hidden">
            <AuthImage
              src={imagePath}
              alt="Imagen del producto"
              width={240}
              height={240}
              preview
              cacheKey={cacheKey}
              fallback={
                <div className="flex flex-col items-center justify-center text-gray-400 w-full h-full">
                  <i className="pi pi-image text-5xl mb-2" />
                  <span className="text-sm">Sin imagen</span>
                </div>
              }
            />
          </div>

          {canWrite && (
            <div className="flex flex-col gap-2">
              <Button
                label="Eliminar imagen"
                icon="pi pi-trash"
                outlined
                severity="danger"
                onClick={handleDelete}
                loading={deleteMut.isPending}
                disabled={uploading || deleteMut.isPending}
              />
            </div>
          )}
        </div>
      </div>

      {canWrite && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Subir / reemplazar imagen
          </h3>
          <p className="text-xs text-gray-500 mb-2">
            Formatos aceptados: JPG, PNG, WebP, GIF. Máximo 10 MB. Se convertirá automáticamente a WebP.
          </p>
          <FileUpload
            ref={fileUpload}
            mode="basic"
            accept="image/*"
            maxFileSize={10 * 1024 * 1024}
            auto
            chooseLabel="Seleccionar imagen"
            customUpload
            uploadHandler={handleUpload}
            disabled={uploading || uploadMut.isPending}
          />
        </div>
      )}
    </div>
  );
}
