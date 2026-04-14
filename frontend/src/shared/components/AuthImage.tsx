import { useEffect, useState } from 'react';
import { Image } from 'primereact/image';
import { apiClient } from '../api/client';

type Props = {
  /** API path relative to the apiClient baseURL (e.g. `/api/products/42/image`) */
  src: string;
  alt?: string;
  className?: string;
  width?: string | number;
  height?: string | number;
  /** When true, renders via PrimeReact `<Image preview>` so clicks open a fullscreen lightbox. */
  preview?: boolean;
  /** Rendered when the image is still loading or has failed. */
  fallback?: React.ReactNode;
  /** Bumps the refetch — pass a cache-busting value (e.g. updatedAt) to force reload. */
  cacheKey?: string | number;
};

export function AuthImage({
  src,
  alt = '',
  className,
  width,
  height,
  preview = false,
  fallback = null,
  cacheKey,
}: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let currentUrl: string | null = null;
    setError(false);
    setObjectUrl(null);

    apiClient
      .get<Blob>(src, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        currentUrl = URL.createObjectURL(res.data);
        setObjectUrl(currentUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [src, cacheKey]);

  if (error || !objectUrl) return <>{fallback}</>;

  if (preview) {
    return (
      <Image
        src={objectUrl}
        alt={alt}
        width={typeof width === 'number' ? String(width) : width}
        height={typeof height === 'number' ? String(height) : height}
        imageClassName={className}
        preview
      />
    );
  }

  return (
    <img
      src={objectUrl}
      alt={alt}
      className={className}
      width={width}
      height={height}
    />
  );
}
