import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

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
    optional: type.endsWith("?"),
  }));
};

describe("SetTarget and its Swift mirror", () => {
  const target = storedProperties(
    swiftSource("ios/App/Shared/StratosSetActivityAttributes.swift"),
    "StratosSetTarget"
  );

  it("names the same fields on both sides", () => {
    expect(target.map(field => field.name)).toEqual(SET_TARGET_FIELDS);
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
