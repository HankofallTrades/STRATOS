import { describe, expect, it } from "vitest";

import {
  shouldAutoReloadRouteError,
  shouldRenderRouteLoadingState,
} from "@/components/layout/routeErrorRecovery";

describe("shouldAutoReloadRouteError", () => {
  it("treats dynamic import failures as reloadable route errors", () => {
    expect(
      shouldAutoReloadRouteError(
        new Error("Failed to fetch dynamically imported module")
      )
    ).toBe(true);
    expect(
      shouldAutoReloadRouteError(new Error("Importing a module script failed."))
    ).toBe(true);
    expect(
      shouldAutoReloadRouteError(new Error("Loading chunk 42 failed."))
    ).toBe(true);
  });

  it("does not auto-reload unrelated render errors", () => {
    expect(
      shouldAutoReloadRouteError(new Error("Cannot read properties of undefined"))
    ).toBe(false);
    expect(shouldAutoReloadRouteError("plain string error")).toBe(false);
  });
});

describe("shouldRenderRouteLoadingState", () => {
  it("keeps showing a loading state while a route recovery attempt is pending", () => {
    expect(
      shouldRenderRouteLoadingState({
        attempts: 0,
        autoReloadScheduled: true,
        hasError: true,
      })
    ).toBe(true);
  });

  it("falls back to the error state once recovery has been exhausted", () => {
    expect(
      shouldRenderRouteLoadingState({
        attempts: 1,
        autoReloadScheduled: false,
        hasError: true,
      })
    ).toBe(false);
  });
});
