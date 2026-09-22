import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { ACTIVITY_JOURNAL_ENTRY_KINDS } from "./activityJournal";
import { SET_ADJUSTMENT_FIELDS, setAdjustmentForKind } from "./setAdjustment";
import { SET_TARGET_FIELDS } from "./setTarget";

// The set targets cross a language boundary: resolved here, stored and
// journalled in Swift, read back here. No compiler spans that, and the failure
// it cannot catch is silent — a field added on one side arrives as nothing on
// the other, which reads as "no target" rather than as an error. So the test
// reads the Swift declaration as text and holds the two field sets together.
//
// It is deliberately about the field set and not the values. Whether the
// numbers survive the round trip is what the device check is for; this only
// answers whether both sides are talking about the same four things.

const swiftSource = (path: string): string =>
  readFileSync(fileURLToPath(new URL(`../../../../${path}`, import.meta.url)), "utf8");

/** The stored properties of a Swift struct, in declaration order. */
const storedProperties = (source: string, structName: string) => {
  const body = source.match(new RegExp(`struct ${structName}[^{]*\\{([\\s\\S]*?)\\n\\}`));
  if (!body) throw new Error(`no struct ${structName} to read`);

  return [...body[1].matchAll(/^\s*let (\w+): ([\w?]+)$/gm)].map(([, name, type]) => ({
    name,
    type,
    optional: type.endsWith("?"),
  }));
};

describe("SetTarget and its Swift mirror", () => {
  const target = storedProperties(
    swiftSource("ios/App/Shared/StratosSetActivityAttributes.swift"),
    "StratosSetTarget"
  );

  it("names the same fields on both sides", () => {
    // Sorted, because declaration order is not part of the contract — JSON is
    // keyed. A test that failed on a reordering would be testing the layout.
    expect(target.map(field => field.name).sort()).toEqual([...SET_TARGET_FIELDS].sort());
  });

  it("writes every one of them out, so none can be added and left unencoded", () => {
    // `encode(to:)` is hand-written, because the synthesised encoding drops
    // absent targets instead of nulling them. That hand-written list is exactly
    // the kind of thing this issue exists to stop: a field added to the struct
    // and not added here still compiles, still decodes, and arrives at the
    // webview as `undefined`.
    const body = swiftSource("ios/App/Shared/StratosSetActivityAttributes.swift").match(
      /func encode\(to encoder: Encoder\) throws \{([\s\S]*?)\n {4}\}/
    );
    if (!body) throw new Error("no encode(to:) to read");

    const encoded = [...body[1].matchAll(/forKey: \.(\w+)\)/g)].map(([, name]) => name);

    expect(encoded.sort()).toEqual([...SET_TARGET_FIELDS].sort());
  });

  it("leaves every one of them able to be absent, because `number | null` is", () => {
    // A non-optional on the Swift side would fail the whole decode for a set
    // the plan resolved nothing for, which is a normal set, not an error.
    expect(target.filter(field => !field.optional)).toEqual([]);
  });

  it("is what the plan and the journal both carry, rather than a third copy", () => {
    // The point of the type is that these two hold it whole. A build that
    // restates the fields inside either of them has undone it.
    const plannedSet = storedProperties(
      swiftSource("ios/App/Shared/StratosSetActivityAttributes.swift"),
      "StratosPlannedSet"
    );
    const journalEntry = storedProperties(
      swiftSource("ios/App/Shared/StratosActivityJournal.swift"),
      "StratosActivityJournalEntry"
    );

    for (const struct of [plannedSet, journalEntry]) {
      expect(struct.map(field => field.name)).toContain("target");
      expect(struct.map(field => field.name)).not.toContain("targetReps");
    }
  });
});

describe("SetAdjustment and its Swift mirror", () => {
  const attributes = swiftSource("ios/App/Shared/StratosSetActivityAttributes.swift");

  it("names the same fields on both sides", () => {
    // The step and the floor travel together or the arithmetic is guesswork: a
    // step with no floor clamps to zero, which is exactly the set the Done
    // button would then be offered for and the replay would refuse.
    expect(
      storedProperties(attributes, "StratosSetAdjustment")
        .map(field => field.name)
        .sort()
    ).toEqual([...SET_ADJUSTMENT_FIELDS].sort());
  });

  it("holds the targets whole, rather than restating their fields", () => {
    expect(
      storedProperties(attributes, "StratosSetAdjustment").map(field => field.type)
    ).toEqual(["StratosSetTarget", "StratosSetTarget"]);
  });
});

describe("ActivityJournalEntryKind and its Swift mirror", () => {
  it("knows the same kinds on both sides", () => {
    // The native side writes these strings and the web reads them; neither
    // compiler sees the other. A kind written but not handled replays as
    // nothing at all, which on this path means a set the user logged and lost.
    const swift = swiftSource("ios/App/Shared/StratosActivityJournal.swift");
    const declared = [
      ...swift
        .match(/enum StratosActivityJournalKind \{([\s\S]*?)\n\}/)![1]
        .matchAll(/static let \w+ = "([\w-]+)"/g),
    ].map(([, value]) => value);

    expect(declared.sort()).toEqual([...ACTIVITY_JOURNAL_ENTRY_KINDS].sort());
  });
});

describe("the stepper arithmetic, stated on both sides", () => {
  // `adjustSetTarget` is where this rule is written and tested, but the copy
  // that actually runs when a finger lands on a locked phone is the Swift one.
  // Nothing compiles the two together, so these read the Swift and fail when it
  // stops doing what the tested side does.
  const attributes = swiftSource("ios/App/Shared/StratosSetActivityAttributes.swift");

  const steppedBodies = [
    ...attributes.matchAll(
      /private func stepped\([\s\S]*?\) -> \w+\? \{([\s\S]*?)\n\}/g
    ),
  ].map(([, body]) => body);

  it("has one implementation per numeric type, and no more", () => {
    // Int for reps and seconds, Double for weight and distance. A third would
    // mean a field whose stepping nobody has thought about.
    expect(steppedBodies).toHaveLength(2);
  });

  it("clamps every one of them to the floor", () => {
    for (const body of steppedBodies) {
      expect(body).toContain("max(floor ?? 0");
    }
  });

  it("leaves a field with no step, or no value, untouched in every one", () => {
    // The refusal that stops a tap on a field the kind has no number for from
    // starting one at zero.
    for (const body of steppedBodies) {
      expect(body).toContain("guard let current, let step else { return current }");
    }
  });
});

describe("the lock-screen steps and the in-app steppers", () => {
  // CONTEXT.md and `setAdjustment.ts` both claim the lock screen moves a value
  // by what the workout screen's stepper would move it by. The two are stated
  // in different languages of the same app — TS data and TSX props — and only
  // this holds them together.
  const view = readFileSync(
    fileURLToPath(new URL("../ui/WorkoutExerciseView.tsx", import.meta.url)),
    "utf8"
  );

  /** The small (tap, not swipe) step of the incrementer with this label. */
  const inAppTapStep = (label: string): number => {
    // Split rather than match across the file: every one of these is a
    // `<SwipeableIncrementer`, so a lazy match would run from the first of them
    // to whichever label was asked for and read the wrong props on the way.
    const block = view
      .split("<SwipeableIncrementer")
      // Quoted, not `label=`: the reps stepper picks its label with a ternary.
      .find(chunk => chunk.includes(`"${label}"`));
    if (!block) throw new Error(`no incrementer labelled "${label}"`);

    const step = block.match(/smallStepPositive=\{([\d.]+)\}/);
    if (!step) throw new Error(`no smallStepPositive on "${label}"`);

    // Cardio scales the step in its handler rather than in the prop.
    const scale = block.match(/onUpdateLastSet\('\w+', adjustment \* ([\d.]+)\)/);
    return Number(step[1]) * (scale ? Number(scale[1]) : 1);
  };

  it("moves weight and reps by what the workout screen moves them by", () => {
    const strength = setAdjustmentForKind("strength").step;

    expect(strength.weight).toBe(inAppTapStep("Adjust weight of last set"));
    expect(strength.reps).toBe(inAppTapStep("Adjust reps of last set"));
  });

  it("moves cardio duration by what the workout screen moves it by", () => {
    expect(setAdjustmentForKind("cardio").step.timeSeconds).toBe(
      inAppTapStep("Adjust duration of last set")
    );
  });
});
