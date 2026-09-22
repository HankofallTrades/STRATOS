import { describe, expect, it } from "vitest";

import { createSafeTopLatch } from "./safeTopLatch";

describe("createSafeTopLatch", () => {
  it("reports the inset the device measured", () => {
    const latch = createSafeTopLatch();

    expect(latch({ orientation: "portrait", top: 59 })).toBe(59);
  });

  /** The bug this exists for: the inset collapses after the login keyboard. */
  it("keeps the inset when WebKit stops reporting it mid-session", () => {
    const latch = createSafeTopLatch();
    latch({ orientation: "portrait", top: 59 });

    expect(latch({ orientation: "portrait", top: 0 })).toBe(59);
  });

  /**
   * The in-call bar makes the inset legitimately grow and then shrink back, so
   * a smaller reading is not the bug and must not be held at the larger value.
   */
  it("follows a non-zero inset down again", () => {
    const latch = createSafeTopLatch();
    latch({ orientation: "portrait", top: 59 });
    latch({ orientation: "portrait", top: 79 });

    expect(latch({ orientation: "portrait", top: 59 })).toBe(59);
  });

  it("leaves the CSS value alone until something real is measured", () => {
    const latch = createSafeTopLatch();

    expect(latch({ orientation: "portrait", top: 0 })).toBeNull();
  });

  it("trusts a landscape zero, where the status bar really is gone", () => {
    const latch = createSafeTopLatch();
    latch({ orientation: "portrait", top: 59 });

    expect(latch({ orientation: "landscape", top: 0 })).toBe(0);
    expect(latch({ orientation: "portrait", top: 0 })).toBe(59);
  });

  it("ignores a sample that is not a usable measurement", () => {
    const latch = createSafeTopLatch();
    latch({ orientation: "portrait", top: 59 });

    expect(latch({ orientation: "portrait", top: Number.NaN })).toBe(59);
    expect(latch({ orientation: "portrait", top: -1 })).toBe(59);
  });
});
