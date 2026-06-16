const AUTO_RELOAD_PATTERNS = [
  "failed to fetch dynamically imported module",
  "importing a module script failed",
  "loading chunk",
  "chunkloaderror",
];

export const shouldAutoReloadRouteError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return AUTO_RELOAD_PATTERNS.some((pattern) => message.includes(pattern));
};

interface RouteLoadingStateInput {
  attempts: number;
  autoReloadScheduled: boolean;
  hasError: boolean;
}

export const shouldRenderRouteLoadingState = ({
  attempts,
  autoReloadScheduled,
  hasError,
}: RouteLoadingStateInput): boolean =>
  hasError && autoReloadScheduled && attempts < 1;
