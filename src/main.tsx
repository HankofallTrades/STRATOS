import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './state/auth/AuthProvider'
import { registerServiceWorker } from './lib/pwa/registerServiceWorker'

const queryClient = new QueryClient()

registerServiceWorker()

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);
