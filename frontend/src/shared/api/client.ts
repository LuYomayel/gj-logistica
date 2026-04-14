import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  // Don't set a default Content-Type — axios auto-picks:
  //   - application/json for plain objects
  //   - multipart/form-data (with correct boundary) for FormData
  // Setting it here globally breaks FormData uploads.
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('gj_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (r) => {
    // 1. Unwrap TransformInterceptor: { data: X, statusCode } → X
    if (
      r.data &&
      typeof r.data === 'object' &&
      !Array.isArray(r.data) &&
      'data' in r.data &&
      'statusCode' in r.data
    ) {
      r.data = r.data.data;
    }

    // 2. Normalizar paginación del backend: { items: T[], total, page, limit } → { data: T[], total, page, limit }
    if (
      r.data &&
      typeof r.data === 'object' &&
      !Array.isArray(r.data) &&
      'items' in r.data &&
      'total' in r.data
    ) {
      const { items, ...rest } = r.data as { items: unknown[]; [k: string]: unknown };
      r.data = { data: items, ...rest };
    }

    // 3. Si el backend devuelve una lista plana, la envolvemos como paginación completa
    if (Array.isArray(r.data)) {
      const arr = r.data as unknown[];
      r.data = { data: arr, total: arr.length, page: 1, limit: arr.length };
    }

    return r;
  },
  (err) => {
    if (err.response?.status === 401) {
      // Don't redirect if the 401 came from the login endpoint itself —
      // let the LoginForm catch block handle the error and show a message.
      const requestUrl = err.config?.url ?? '';
      const isLoginRequest = requestUrl.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('gj_token');
        localStorage.removeItem('gj_user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  },
);
