import { describe, expect, it } from "vitest";

import { DEFAULT_AUTO_ADD_SET_COUNT, shouldAutoAddSet } from "./setAutoAdd";

// The rule these tests hold is that an exercise stops opening sets on its own
// once it has matched what it did last time. Auto-add that never stops is what
// keeps the Set Plan's current entry on the first exercise for a whole session,
// so "stops" is the business rule here — not "adds".

/** Last session, as a count of sets performed. */
const previousSets = (count: number): readonly unknown[] =>
  Array.from({ length: count }, (_, index) => ({ set_number: index + 1 }));

describe("shouldAutoAddSet", () => {
  it("opens another set while the exercise is short of last session's count", () => {
    expect(shouldAutoAddSet({ setCount: 3, previousSets: previousSets(5) })).toBe(true);
  });

  it("stops once the exercise has matched last session's count", () => {
    expect(shouldAutoAddSet({ setCount: 5, previousSets: previousSets(5) })).toBe(false);
  });

  it("stops below the default cap when last session was shorter", () => {
    expect(shouldAutoAddSet({ setCount: 2, previousSets: previousSets(2) })).toBe(false);
  });

  it("keeps opening sets past the default cap when last session was longer", () => {
    expect(
      shouldAutoAddSet({
        setCount: DEFAULT_AUTO_ADD_SET_COUNT,
        previousSets: previousSets(4),
      })
    ).toBe(true);
  });

  it("stops at the default cap when the exercise has no history", () => {
    expect(
      shouldAutoAddSet({ setCount: DEFAULT_AUTO_ADD_SET_COUNT, previousSets: null })
    ).toBe(false);
    expect(
      shouldAutoAddSet({ setCount: DEFAULT_AUTO_ADD_SET_COUNT - 1, previousSets: null })
    ).toBe(true);
  });

  it("treats an empty history as no history rather than a zero-set exercise", () => {
    // Falling through to the cap matters more than it looks: without it an
    // exercise whose history has not loaded yet would never open a set at all.
    expect(shouldAutoAddSet({ setCount: 1, previousSets: [] })).toBe(true);
    expect(
      shouldAutoAddSet({ setCount: DEFAULT_AUTO_ADD_SET_COUNT, previousSets: [] })
    ).toBe(false);
  });

  it("never opens a set for an exercise already past last session's count", () => {
    expect(shouldAutoAddSet({ setCount: 8, previousSets: previousSets(3) })).toBe(false);
  });

  it("opens exactly enough sets to match last session, counting from one", () => {
    // The whole arithmetic end to end: `setCount` includes the set being
    // completed, so a strict `<` has to land on last session's count exactly.
    const history = previousSets(3);
    const opened = [1, 2, 3].map(setCount =>
      shouldAutoAddSet({ setCount, previousSets: history })
    );

    expect(opened).toEqual([true, true, false]);
  });
});
