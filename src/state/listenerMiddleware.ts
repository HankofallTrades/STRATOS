import { createListenerMiddleware, type TypedStartListening } from '@reduxjs/toolkit';

import type { AppDispatch, RootState } from './store';

// Lets a feature react to an action without the dispatcher knowing it exists.
// Rest timer and set-completion haptics use it so nothing has to be threaded
// through props from the checkbox that logged the set.
export const listenerMiddleware = createListenerMiddleware();

export const startAppListening =
  listenerMiddleware.startListening as TypedStartListening<RootState, AppDispatch>;
