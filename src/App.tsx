import { Toaster } from "@/components/core/Toast/toaster";
import { Toaster as Sonner } from "@/components/core/sonner";
import { TooltipProvider } from "@/components/core/tooltip";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './state/store';
import { ThemeProvider as NextThemeProvider } from "next-themes";
import { ThemeProvider } from "@/lib/themes";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import MainAppLayout from "@/components/layout/MainAppLayout";
import LoginPage from "./pages/LoginPage";
import WaitlistPage from "./pages/WaitlistPage";

// App component sets up providers and routes
const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <NextThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <ThemeProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Router>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/waitlist" element={<WaitlistPage />} />

                  {/* Protected Routes */}
                  <Route
                    path="/*"
                    element={
                      <ProtectedRoute>
                        <MainAppLayout />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Router>
            </TooltipProvider>
          </ThemeProvider>
        </NextThemeProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;
