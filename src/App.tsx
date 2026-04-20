import { Suspense, lazy } from "react";
import { Toaster } from "@/components/core/Toast/toaster";
import { Toaster as Sonner } from "@/components/core/sonner";
import { TooltipProvider } from "@/components/core/tooltip";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider as NextThemeProvider } from "next-themes";

import { ThemeProvider } from "@/lib/themes";

import LoginPage from "./pages/LoginPage";
import WaitlistPage from "./pages/WaitlistPage";

const ProtectedAppShell = lazy(
  () => import("@/components/layout/ProtectedAppShell")
);

const ProtectedShellFallback = () => (
  <div className="min-h-screen bg-background" />
);

// App component sets up providers and routes
const App = () => {
  return (
    <NextThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/waitlist" element={<WaitlistPage />} />
              <Route
                path="/*"
                element={
                  <Suspense fallback={<ProtectedShellFallback />}>
                    <ProtectedAppShell />
                  </Suspense>
                }
              />
            </Routes>
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </NextThemeProvider>
  );
};

export default App;
