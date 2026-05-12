import { useEffect, useState } from "react";

export const useDeferredMount = (delayMs: number = 250) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    let timeoutId: number | null = null;
    let idleCallbackId: number | null = null;

    const mount = () => {
      if (!isCancelled) {
        setIsMounted(true);
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleCallbackId = window.requestIdleCallback(mount, { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(mount, delayMs);
    }

    return () => {
      isCancelled = true;
      if (
        idleCallbackId !== null &&
        typeof window !== "undefined" &&
        "cancelIdleCallback" in window
      ) {
        window.cancelIdleCallback(idleCallbackId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [delayMs]);

  return isMounted;
};
