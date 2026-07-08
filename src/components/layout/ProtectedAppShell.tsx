import { Provider } from "react-redux";

import { Toaster } from "@/components/core/Toast/toaster";
import { Toaster as Sonner } from "@/components/core/sonner";
import { TooltipProvider } from "@/components/core/tooltip";
import MainAppLayout from "@/components/layout/MainAppLayout";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { AuthProvider } from "@/state/auth/AuthProvider";
import { store } from "@/state/store";

const ProtectedAppShell = () => {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <Provider store={store}>
          <ProtectedRoute>
            <MainAppLayout />
          </ProtectedRoute>
        </Provider>
      </AuthProvider>
    </TooltipProvider>
  );
};

export default ProtectedAppShell;
