interface CooldownEntry {
  suppressedUntil: string;
}

type CooldownMap = Record<string, CooldownEntry>;

const storageKey = (userId: string) => `stratos.coach.proactive.${userId}`;

export const cooldownKey = (insightId: string, dedupeKey?: string) =>
  dedupeKey ? `${insightId}:${dedupeKey}` : insightId;

const readCooldowns = (userId: string): CooldownMap => {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as CooldownMap) : {};
  } catch {
    return {};
  }
};

const writeCooldowns = (userId: string, map: CooldownMap): void => {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(map));
  } catch {
    // Storage unavailable: cooldowns degrade to session memory (engine state).
  }
};

export const isSuppressed = (
  userId: string,
  key: string,
  now: Date = new Date()
): boolean => {
  const entry = readCooldowns(userId)[key];
  if (!entry) return false;
  return new Date(entry.suppressedUntil).getTime() > now.getTime();
};

export const suppress = (
  userId: string,
  key: string,
  hours: number,
  now: Date = new Date()
): void => {
  const map = readCooldowns(userId);
  map[key] = {
    suppressedUntil: new Date(
      now.getTime() + hours * 60 * 60 * 1000
    ).toISOString(),
  };
  writeCooldowns(userId, map);
};
