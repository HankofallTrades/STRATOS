import { describe, expect, it } from "vitest";

import {
  archetypeColors,
  buildVolumeProgressDisplayData,
  getCurrentWeekRange,
} from "./volumeProgress";
import type { WeeklyArchetypeSetData } from "@/domains/analytics/data/analyticsRepository";

const row = (
  base_archetype_name: string,
  archetype_subtype_name: string | null,
  total_sets: number
): WeeklyArchetypeSetData =>
  ({
    base_archetype_name,
    archetype_subtype_name,
    total_sets,
  } as unknown as WeeklyArchetypeSetData);

const byName = (data: ReturnType<typeof buildVolumeProgressDisplayData>) =>
  Object.fromEntries(data.map((d) => [d.name, d]));

describe("buildVolumeProgressDisplayData", () => {
  it("always returns all six movement patterns in a fixed order", () => {
    // The chart is a fixed dashboard — every archetype shows even at zero.
    const data = buildVolumeProgressDisplayData([]);
    expect(data.map((d) => d.name)).toEqual([
      "Squat",
      "Lunge",
      "Push",
      "Pull",
      "Bend",
      "Twist",
    ]);
    expect(data.every((d) => d.totalSets === 0)).toBe(true);
  });

  it("carries the per-archetype weekly set goals", () => {
    const data = byName(buildVolumeProgressDisplayData([]));
    expect(data.Push.goal).toBe(10);
    expect(data.Pull.goal).toBe(10);
    expect(data.Squat.goal).toBe(7);
  });

  it("sums sets per base archetype for non-push/pull patterns", () => {
    const data = byName(
      buildVolumeProgressDisplayData([
        row("Squat", null, 4),
        row("Squat", null, 3),
      ])
    );
    expect(data.Squat.totalSets).toBe(7);
  });

  it("splits push/pull into vertical + horizontal sub-volumes", () => {
    // Push and Pull are tracked as two planes; total is their sum.
    const data = byName(
      buildVolumeProgressDisplayData([
        row("Push", "Vertical", 3),
        row("Push", "horizontal", 2),
      ])
    );
    expect(data.Push.verticalSets).toBe(3);
    expect(data.Push.horizontalSets).toBe(2);
    expect(data.Push.totalSets).toBe(5);
  });

  it("highlights an archetype only once its goal is met", () => {
    // Hitting the weekly target is the moment the bar changes color.
    const met = byName(
      buildVolumeProgressDisplayData([row("Squat", null, 7)])
    );
    const notMet = byName(
      buildVolumeProgressDisplayData([row("Squat", null, 6)])
    );
    expect(met.Squat.displayColor).toBe(archetypeColors.Squat.highlight);
    expect(notMet.Squat.displayColor).toBe(archetypeColors.Squat.default);
  });

  it("ignores archetype names outside the tracked six", () => {
    const data = byName(
      buildVolumeProgressDisplayData([row("Cardio", null, 99)])
    );
    expect(data.Squat.totalSets).toBe(0);
    expect(Object.keys(data)).toHaveLength(6);
  });
});

describe("getCurrentWeekRange", () => {
  // The range drives the weekly-volume query window, so it must be the local
  // Mon–Sun calendar week regardless of the runner's timezone. (It once used
  // toISOString(), which serialized in UTC and shifted `start` to the prior
  // Sunday in UTC+ zones — the fix formats from local components instead.)
  const localDay = (isoDate: string) => new Date(`${isoDate}T00:00:00`).getDay();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  it("returns two ISO-date strings spanning exactly a Mon–Sun week", () => {
    const { start, end } = getCurrentWeekRange();
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Start is a Monday, end is a Sunday, six calendar days apart.
    expect(localDay(start)).toBe(1);
    expect(localDay(end)).toBe(0);
    expect((Date.parse(end) - Date.parse(start)) / MS_PER_DAY).toBe(6);
  });
});
