import { Toaster } from "@/components/core/Toast/toaster";
import { Toaster as Sonner } from "@/components/core/sonner";
import { TooltipProvider } from "@/components/core/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './state/store';
import { ThemeProvider } from "next-themes";
import BottomNav from "@/components/layout/BottomNav";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Home from "./pages/Home";
import Workout from "./pages/Workout";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import WaitlistPage from "./pages/WaitlistPage";
import Coach from "./pages/Coach";

const queryClient = new QueryClient();

// Main Application Layout (for authenticated users)
const MainAppLayout = () => {
  return (
    <div> {/* Padding REMOVED from here */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/workout" element={<Workout />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/coach" element={<Coach />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </div>
  );
};

// App component sets up providers and routes
const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}> {/* Consider a loading indicator here */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
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
                  path="/*" // Match all routes not matched above
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
      </PersistGate>
    </Provider>
  );
};

export default App;
