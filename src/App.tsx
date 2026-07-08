import { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { ThemeProvider as NextThemeProvider } from "next-themes";

import { RouteSkeleton } from "@/components/loading/RouteSkeletons";
import ProtectedAppEntry from "@/components/layout/ProtectedAppEntry";
import { ThemeProvider } from "@/lib/themes";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const WaitlistPage = lazy(() => import("./pages/WaitlistPage"));

const RouteFallback = () => {
  const location = useLocation();
  return <RouteSkeleton pathname={location.pathname} />;
};

// App component sets up providers and routes
const App = () => {
  return (
    <NextThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route
              path="/login"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <LoginPage />
                </Suspense>
              }
            />
            <Route
              path="/waitlist"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <WaitlistPage />
                </Suspense>
              }
            />
            <Route
              path="/*"
              element={<ProtectedAppEntry />}
            />
          </Routes>
        </Router>
      </ThemeProvider>
    </NextThemeProvider>
  );
};

export default App;
