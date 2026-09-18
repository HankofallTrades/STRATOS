import { useEffect, useId } from "react";

import { keepAwakeController } from "@/lib/native/keepAwake";

/**
 * Holds the screen on while `active` is true, under a name unique to this
 * component instance. Released when `active` turns false and on unmount, so
 * leaving the surface always lets go even if its state never reached "done".
 */
export const useKeepAwake = (active: boolean): void => {
  const holder = useId();

  useEffect(() => {
    if (!active) return;
    void keepAwakeController.acquire(holder);
    return () => {
      void keepAwakeController.release(holder);
    };
  }, [active, holder]);
};
