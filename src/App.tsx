import { Toaster } from "@/components/core/Toast/toaster";
import { Toaster as Sonner } from "@/components/core/sonner";
import { TooltipProvider } from "@/components/core/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './state/store';
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import BottomNav from "@/components/layout/BottomNav";
import { useWorkoutTimer } from './hooks/useWorkoutTimer';

const queryClient = new QueryClient();

// New component to contain the main application logic and hook call
const AppContent = () => {
  useWorkoutTimer(); // Call the hook within a child of the Provider

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Router>
            <div className="pb-20">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <BottomNav />
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// App component now only sets up the top-level providers
const App = () => {
  // useWorkoutTimer(); // Move hook call to AppContent

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppContent /> {/* Render the new content component */} 
      </PersistGate>
    </Provider>
  );
};

export default App;
