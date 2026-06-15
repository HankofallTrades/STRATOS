import { describe, expect, it } from "vitest";

import { getAutomaticTimeRange } from "./oneRepMaxRange";

describe("getAutomaticTimeRange", () => {
  it("keeps ALL when there is no history", () => {
    expect(getAutomaticTimeRange([])).toBe("ALL");
  });

  it("keeps ALL for a single workout", () => {
    expect(getAutomaticTimeRange([{ workout_date: "2026-01-15" }])).toBe("ALL");
  });

  it("keeps ALL when history spans less than three months", () => {
    expect(
      getAutomaticTimeRange([
        { workout_date: "2026-01-15" },
        { workout_date: "2026-04-14" },
      ])
    ).toBe("ALL");
  });

  it("keeps ALL at the exact three-month boundary", () => {
    expect(
      getAutomaticTimeRange([
        { workout_date: "2026-01-15" },
        { workout_date: "2026-04-15" },
      ])
    ).toBe("ALL");
  });

  it("uses 3M when history spans more than three calendar months", () => {
    expect(
      getAutomaticTimeRange([
        { workout_date: "2026-01-15" },
        { workout_date: "2026-04-16" },
      ])
    ).toBe("3M");
  });
});
