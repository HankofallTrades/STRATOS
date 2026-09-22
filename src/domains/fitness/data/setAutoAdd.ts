// Auto-add: whether completing the last set of an exercise should open another
// one. Completing a set used to always append a fresh one, which meant every
// exercise permanently held an open set. The Set Plan's current entry is the
// first set still open, so that trailing set pinned it to the first exercise of
// the session and it never reached the second.
//
// An exercise stops opening sets once it has matched what it did last time.
// Last session's set count is the only honest answer the app already has to
// "how many sets is this exercise", and it is the same history the suggestions
// are built from, so the two cannot drift.

/**
 * How many sets to open for an exercise with no history behind it.
 *
 * A first-ever exercise has nothing to match, and three is the common case.
 * Stopping there is recoverable in a way that never stopping is not: the Add
 * Set row is still one tap away, whereas a session-long stuck entry is only
 * noticeable once the lock screen is already wrong.
 */
export const DEFAULT_AUTO_ADD_SET_COUNT = 3;

export interface ShouldAutoAddSetInput {
  /** How many sets the exercise holds right now, the completed one included. */
  setCount: number;
  /**
   * The sets this exercise performed the last time it was trained — one element
   * per set, which is the count to match. Empty or absent means no history.
   */
  previousSets: readonly unknown[] | null | undefined;
  /**
   * Whether that history has finished loading.
   *
   * Needed because an exercise that has never been trained and one whose
   * history is still in flight both arrive here as nothing at all, and they
   * call for opposite answers.
   */
  previousSetsLoaded: boolean;
}

/**
 * Whether the exercise should open another set now that its last one is done.
 */
export const shouldAutoAddSet = ({
  setCount,
  previousSets,
  previousSetsLoaded,
}: ShouldAutoAddSetInput): boolean => {
  // With no history in hand and more still coming, how long this exercise runs
  // is not yet knowable, and the question does not come round again: the
  // decision is only ever made at the moment a set is completed, so capping a
  // five-set exercise at three here would stand for the rest of the session.
  // While it is in flight the rule errs towards opening. A set the user did not
  // need is a blank row they can ignore; one they did need strands them on Add
  // Set, which is the flow this rule exists to protect.
  if (!previousSetsLoaded && !previousSets?.length) return true;

  return setCount < (previousSets?.length || DEFAULT_AUTO_ADD_SET_COUNT);
};
