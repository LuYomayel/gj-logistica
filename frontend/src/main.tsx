import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// CSS layer order MUST be declared before any PrimeReact CSS.
// Without this, @layer primereact (declared first in theme.css) gets the
// lowest cascade priority and Tailwind utilities override it.
import './layer-order.css';

// PrimeReact
import { PrimeReactProvider } from 'primereact/api';
import 'primereact/resources/themes/lara-light-cyan/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

import './index.css';
import { AuthProvider } from './shared/hooks/useAuth';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <PrimeReactProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </PrimeReactProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
