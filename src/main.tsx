import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { startSafeTopLatch } from './lib/native/safeTopLatch'
import { queryClientDefaultOptions } from './lib/query/loadingPolicies'

// Before the first paint: the status bar inset has to be right on every screen,
// not just the ones React has mounted.
startSafeTopLatch()

const queryClient = new QueryClient({
  defaultOptions: queryClientDefaultOptions,
})

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
