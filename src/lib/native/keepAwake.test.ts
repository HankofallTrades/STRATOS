import { describe, expect, it, vi } from "vitest";

import { createKeepAwakeController } from "./keepAwake";

const fakePlugin = () => ({
  keepAwake: vi.fn().mockResolvedValue(undefined),
  allowSleep: vi.fn().mockResolvedValue(undefined),
});

describe("createKeepAwakeController", () => {
  it("keeps the screen awake on the first holder and releases it on the last", async () => {
    const plugin = fakePlugin();
    const controller = createKeepAwakeController(plugin);

    await controller.acquire("workout");
    expect(plugin.keepAwake).toHaveBeenCalledTimes(1);

    await controller.release("workout");
    expect(plugin.allowSleep).toHaveBeenCalledTimes(1);
  });

  // A breathwork run inside a workout is two holders on one screen. Ending the
  // breathwork must not let the screen sleep mid-workout.
  it("does not release while another holder is still active", async () => {
    const plugin = fakePlugin();
    const controller = createKeepAwakeController(plugin);

    await controller.acquire("workout");
    await controller.acquire("breathwork");
    expect(plugin.keepAwake).toHaveBeenCalledTimes(1);

    await controller.release("breathwork");
    expect(plugin.allowSleep).not.toHaveBeenCalled();

    await controller.release("workout");
    expect(plugin.allowSleep).toHaveBeenCalledTimes(1);
  });

  it("is idempotent per holder, so a re-render cannot double-count", async () => {
    const plugin = fakePlugin();
    const controller = createKeepAwakeController(plugin);

    await controller.acquire("workout");
    await controller.acquire("workout");
    await controller.release("workout");

    expect(plugin.keepAwake).toHaveBeenCalledTimes(1);
    expect(plugin.allowSleep).toHaveBeenCalledTimes(1);
  });

  it("ignores a release from a holder that never acquired", async () => {
    const plugin = fakePlugin();
    const controller = createKeepAwakeController(plugin);

    await controller.release("ghost");

    expect(plugin.allowSleep).not.toHaveBeenCalled();
  });

  // A route change right after a workout starts fires release while acquire
  // is still awaiting the plugin. Without ordering, release sees nothing held
  // and skips allowSleep, then acquire lands and the screen stays on for good.
  it("lets go even when the release arrives before the acquire has finished", async () => {
    const plugin = fakePlugin();
    let finishKeepAwake!: () => void;
    plugin.keepAwake.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishKeepAwake = resolve;
      })
    );
    const controller = createKeepAwakeController(plugin);

    const acquiring = controller.acquire("workout");
    const releasing = controller.release("workout");
    expect(plugin.allowSleep).not.toHaveBeenCalled();

    finishKeepAwake();
    await Promise.all([acquiring, releasing]);

    expect(plugin.keepAwake).toHaveBeenCalledTimes(1);
    expect(plugin.allowSleep).toHaveBeenCalledTimes(1);
  });

  it("does not hold the screen if the plugin call fails", async () => {
    const plugin = fakePlugin();
    plugin.keepAwake.mockRejectedValueOnce(new Error("unsupported"));
    const controller = createKeepAwakeController(plugin);

    await controller.acquire("workout");
    await controller.release("workout");

    expect(plugin.allowSleep).not.toHaveBeenCalled();
  });
});
