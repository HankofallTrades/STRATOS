import { Suspense, lazy } from "react";
import { Toaster } from "@/components/core/Toast/toaster";
import { Toaster as Sonner } from "@/components/core/sonner";
import { TooltipProvider } from "@/components/core/tooltip";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider as NextThemeProvider } from "next-themes";

import { ThemeProvider } from "@/lib/themes";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const WaitlistPage = lazy(() => import("./pages/WaitlistPage"));
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
              <Route
                path="/login"
                element={
                  <Suspense fallback={<ProtectedShellFallback />}>
                    <LoginPage />
                  </Suspense>
                }
              />
              <Route
                path="/waitlist"
                element={
                  <Suspense fallback={<ProtectedShellFallback />}>
                    <WaitlistPage />
                  </Suspense>
                }
              />
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
