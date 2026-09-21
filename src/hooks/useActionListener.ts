import type { ActionCreatorWithPayload } from '@reduxjs/toolkit';
import { useEffect, useRef } from 'react';

import { startAppListening } from '@/state/listenerMiddleware';

/**
 * Run a handler whenever an action is dispatched, for as long as the component
 * is mounted. The handler sees the values from the latest render, so it can
 * close over props and query data without re-subscribing on every change.
 */
export const useActionListener = <Payload,>(
  actionCreator: ActionCreatorWithPayload<Payload>,
  handler: (payload: Payload) => void
) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(
    () =>
      startAppListening({
        actionCreator,
        effect: (action) => {
          handlerRef.current(action.payload);
        },
      }),
    [actionCreator]
  );
};
