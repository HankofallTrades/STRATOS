import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { RouteSkeleton } from "@/components/loading/RouteSkeletons";
import {
  resolveProtectedSession,
  shouldResolveProtectedSession,
  type ProtectedGateState,
} from "@/state/auth/protectedSessionGate";

const ProtectedAppShell = lazy(
  () => import("@/components/layout/ProtectedAppShell")
);

const ProtectedAppEntry = () => {
  const location = useLocation();
  const [gateState, setGateState] = useState<ProtectedGateState>("checking");

  // Resolves once, on entry into the protected tree — deliberately not per
  // navigation. See shouldResolveProtectedSession.
  useEffect(() => {
    if (!shouldResolveProtectedSession(gateState)) return;

    let isActive = true;

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
  }, [gateState]);

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
