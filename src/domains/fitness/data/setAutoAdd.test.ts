import { describe, expect, it } from "vitest";

import { DEFAULT_AUTO_ADD_SET_COUNT, shouldAutoAddSet } from "./setAutoAdd";

// The rule these tests hold is that an exercise stops opening sets on its own
// once it has matched what it did last time. Auto-add that never stops is what
// keeps the Set Plan's current entry on the first exercise for a whole session,
// so "stops" is the business rule here — not "adds".

/** Last session, as a count of sets performed. */
const previousSets = (count: number): readonly unknown[] =>
  Array.from({ length: count }, (_, index) => ({ set_number: index + 1 }));

/** Loaded history is the ordinary case; the tests that care say otherwise. */
const shouldAutoAdd = (
  input: Omit<Parameters<typeof shouldAutoAddSet>[0], "previousSetsLoaded"> & {
    previousSetsLoaded?: boolean;
  }
) => shouldAutoAddSet({ previousSetsLoaded: true, ...input });

describe("shouldAutoAddSet", () => {
  it("opens another set while the exercise is short of last session's count", () => {
    expect(shouldAutoAdd({ setCount: 3, previousSets: previousSets(5) })).toBe(true);
  });

  it("stops once the exercise has matched last session's count", () => {
    expect(shouldAutoAdd({ setCount: 5, previousSets: previousSets(5) })).toBe(false);
  });

  it("stops below the default cap when last session was shorter", () => {
    expect(shouldAutoAdd({ setCount: 2, previousSets: previousSets(2) })).toBe(false);
  });

  it("keeps opening sets past the default cap when last session was longer", () => {
    expect(
      shouldAutoAdd({
        setCount: DEFAULT_AUTO_ADD_SET_COUNT,
        previousSets: previousSets(4),
      })
    ).toBe(true);
  });

  it("stops at the default cap when the exercise has no history", () => {
    expect(
      shouldAutoAdd({ setCount: DEFAULT_AUTO_ADD_SET_COUNT, previousSets: null })
    ).toBe(false);
    expect(
      shouldAutoAdd({ setCount: DEFAULT_AUTO_ADD_SET_COUNT - 1, previousSets: null })
    ).toBe(true);
  });

  it("treats an empty history as no history rather than a zero-set exercise", () => {
    // An exercise that has genuinely never been trained falls through to the
    // cap rather than reading as a zero-set exercise that opens nothing.
    expect(shouldAutoAdd({ setCount: 1, previousSets: [] })).toBe(true);
    expect(
      shouldAutoAdd({ setCount: DEFAULT_AUTO_ADD_SET_COUNT, previousSets: [] })
    ).toBe(false);
  });

  it("keeps opening sets while history is still loading", () => {
    // History is a fetch, and an absent history is indistinguishable from one
    // that has not arrived. Capping at three on a not-yet-loaded five-set
    // exercise does not self-heal — the decision is only ever made at the
    // moment a set is completed — so while it is in flight the rule errs
    // towards opening. A blank set is ignorable; a missing one is not.
    expect(
      shouldAutoAdd({
        setCount: DEFAULT_AUTO_ADD_SET_COUNT,
        previousSets: null,
        previousSetsLoaded: false,
      })
    ).toBe(true);
    expect(
      shouldAutoAdd({ setCount: 12, previousSets: [], previousSetsLoaded: false })
    ).toBe(true);
  });

  it("uses history that arrived early even while other lookups load", () => {
    // Only the absence is ambiguous. Sets already in hand answer the question
    // outright, whatever else is still in flight.
    expect(
      shouldAutoAdd({ setCount: 3, previousSets: previousSets(3), previousSetsLoaded: false })
    ).toBe(false);
  });

  it("never opens a set for an exercise already past last session's count", () => {
    expect(shouldAutoAdd({ setCount: 8, previousSets: previousSets(3) })).toBe(false);
  });

  it("opens exactly enough sets to match last session, counting from one", () => {
    // The whole arithmetic end to end: `setCount` includes the set being
    // completed, so a strict `<` has to land on last session's count exactly.
    const history = previousSets(3);
    const opened = [1, 2, 3].map(setCount =>
      shouldAutoAdd({ setCount, previousSets: history })
    );

    expect(opened).toEqual([true, true, false]);
  });
});
