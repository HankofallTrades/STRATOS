import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { RouteSkeleton } from "@/components/loading/RouteSkeletons";
import { resolveProtectedSession } from "@/state/auth/protectedSessionGate";

const ProtectedAppShell = lazy(
  () => import("@/components/layout/ProtectedAppShell")
);

type GateState = "checking" | "authenticated" | "unauthenticated";

const ProtectedAppEntry = () => {
  const location = useLocation();
  const [gateState, setGateState] = useState<GateState>("checking");

  useEffect(() => {
    let isActive = true;

    setGateState("checking");
    void resolveProtectedSession()
      .then(result => {
        if (!isActive) return;
        setGateState(
          result.status === "authenticated" ? "authenticated" : "unauthenticated"
        );
      })
      .catch(() => {
        if (isActive) {
          setGateState("unauthenticated");
        }
      });

    return () => {
      isActive = false;
    };
  }, [location.pathname]);

  if (gateState === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (gateState === "authenticated") {
    return (
      <Suspense fallback={<RouteSkeleton pathname={location.pathname} />}>
        <ProtectedAppShell />
      </Suspense>
    );
  }

  return <div className="min-h-screen bg-background" aria-busy="true" />;
};

export default ProtectedAppEntry;
