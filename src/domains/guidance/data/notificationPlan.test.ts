import { describe, expect, it } from "vitest";

import {
  buildNotificationPlan,
  diffNotificationPlan,
  type NotificationPlanInputs,
  type PlannedNotification,
  type ScheduledNotification,
} from "./notificationPlan";
import type { ActiveMesocycleProgram } from "@/domains/periodization";
import type { Workout } from "@/lib/types/workout";

// Local timestamps keep getDay() and local-day arithmetic stable across
// timezones. 2026-06-10 is a Wednesday.
const WEDNESDAY_0700 = new Date("2026-06-10T07:00:00");
const MON_WED_FRI = [1, 3, 5];

const program = (
  overrides: Partial<ActiveMesocycleProgram["mesocycle"]> = {},
  nextSessionName: string | null = "Upper Push"
): ActiveMesocycleProgram =>
  ({
    mesocycle: {
      start_date: "2026-06-01",
      training_weekdays: MON_WED_FRI,
      ...overrides,
    },
    next_session_name: nextSessionName,
  } as unknown as ActiveMesocycleProgram);

const workoutOn = (localDateTime: string): Workout =>
  ({ date: localDateTime } as unknown as Workout);

const inputs = (
  overrides: Partial<NotificationPlanInputs> = {}
): NotificationPlanInputs => ({
  now: WEDNESDAY_0700,
  activeProgram: program(),
  // Monday's session was the last one.
  workoutHistory: [workoutOn("2026-06-08T18:00:00")],
  preferences: { enabled: true, reminderTime: "08:00" },
  ...overrides,
});

const reminders = (plan: PlannedNotification[]) =>
  plan.filter((notification) => notification.kind === "session_reminder");

const missed = (plan: PlannedNotification[]) =>
  plan.filter((notification) => notification.kind === "missed_training");

const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

describe("buildNotificationPlan — session reminders", () => {
  it("reminds on a planned training day at the chosen reminder time", () => {
    const plan = reminders(buildNotificationPlan(inputs()));

    expect(plan[0].at).toEqual(new Date("2026-06-10T08:00:00"));
    expect(plan[0].body).toContain("Upper Push");
  });

  it("only reminds on the program's training weekdays", () => {
    // Over two weeks, Mon/Wed/Fri from Wednesday onwards: the rest days
    // (Tue, Thu, Sat, Sun) must never carry a reminder.
    const plan = reminders(buildNotificationPlan(inputs()));

    expect(plan.map((notification) => localDay(notification.at))).toEqual([
      "2026-06-10",
      "2026-06-12",
      "2026-06-15",
      "2026-06-17",
      "2026-06-19",
      "2026-06-22",
    ]);
  });

  it("does not remind on a rest day, and reminds on the next training day", () => {
    const plan = reminders(
      buildNotificationPlan(inputs({ now: new Date("2026-06-09T07:00:00") })) // Tuesday
    );

    expect(localDay(plan[0].at)).toBe("2026-06-10");
  });

  it("falls back to the default time when the stored one is malformed", () => {
    const plan = reminders(
      buildNotificationPlan(
        inputs({ preferences: { enabled: true, reminderTime: "25:99" } })
      )
    );

    expect(plan[0].at).toEqual(new Date("2026-06-10T08:00:00"));
  });

  it("follows the reminder time the user set", () => {
    const plan = reminders(
      buildNotificationPlan(
        inputs({ preferences: { enabled: true, reminderTime: "17:30" } })
      )
    );

    expect(plan[0].at).toEqual(new Date("2026-06-10T17:30:00"));
  });

  it("does not remind today once today's session is logged", () => {
    // Finishing a workout re-plans: today's reminder must drop out, or the
    // app nags about a session already done.
    const plan = reminders(
      buildNotificationPlan(
        inputs({
          now: new Date("2026-06-10T07:30:00"),
          workoutHistory: [workoutOn("2026-06-10T07:15:00")],
        })
      )
    );

    expect(localDay(plan[0].at)).toBe("2026-06-12");
  });

  it("never schedules a reminder whose time has already passed", () => {
    const plan = reminders(
      buildNotificationPlan(inputs({ now: new Date("2026-06-10T09:00:00") }))
    );

    expect(localDay(plan[0].at)).toBe("2026-06-12");
  });

  it("falls back to a generic line when the next session has no name", () => {
    const plan = reminders(
      buildNotificationPlan(inputs({ activeProgram: program({}, null) }))
    );

    expect(plan[0].body).toBe("Today is a training day.");
  });
});

describe("buildNotificationPlan — nothing to schedule", () => {
  it("schedules nothing without an active program", () => {
    expect(buildNotificationPlan(inputs({ activeProgram: null }))).toEqual([]);
  });

  it("schedules nothing when the program has no training days set", () => {
    // A rotation with no weekdays is not a schedule: there is no day on
    // which a session is due or can be missed.
    expect(
      buildNotificationPlan(
        inputs({ activeProgram: program({ training_weekdays: [] }) })
      )
    ).toEqual([]);
  });

  it("schedules nothing when the user has turned reminders off", () => {
    expect(
      buildNotificationPlan(
        inputs({ preferences: { enabled: false, reminderTime: "08:00" } })
      )
    ).toEqual([]);
  });
});

describe("buildNotificationPlan — missed training", () => {
  it("nudges on the evening of the second missed training day, not the first", () => {
    // Last session Monday. Wednesday is the first scheduled day after it,
    // Friday the second: two misses are only established on Friday.
    const plan = missed(buildNotificationPlan(inputs()));

    expect(plan).toHaveLength(1);
    expect(plan[0].at).toEqual(new Date("2026-06-12T20:00:00"));
  });

  it("pushes the nudge out when a session is logged", () => {
    const plan = missed(
      buildNotificationPlan(
        inputs({ workoutHistory: [workoutOn("2026-06-10T06:30:00")] })
      )
    );

    // Last session now Wednesday: Friday is miss one, Monday is miss two.
    expect(plan[0].at).toEqual(new Date("2026-06-15T20:00:00"));
  });

  it("counts a session on a rest day as training", () => {
    const plan = missed(
      buildNotificationPlan(
        inputs({
          now: new Date("2026-06-11T07:00:00"),
          workoutHistory: [workoutOn("2026-06-11T06:30:00")], // Thursday
        })
      )
    );

    expect(plan[0].at).toEqual(new Date("2026-06-15T20:00:00"));
  });

  it("does not schedule a nudge for misses that are already in the past", () => {
    // Last session a fortnight ago: the second miss happened long before now,
    // and a notification cannot be scheduled into the past.
    const plan = missed(
      buildNotificationPlan(
        inputs({ workoutHistory: [workoutOn("2026-05-25T18:00:00")] })
      )
    );

    expect(plan).toEqual([]);
  });

  it("does not count days before the program started as misses", () => {
    // No sessions logged and a program that starts today (Wednesday): the
    // first miss is today, the second Friday.
    const plan = missed(
      buildNotificationPlan(
        inputs({
          activeProgram: program({ start_date: "2026-06-10" }),
          workoutHistory: [],
        })
      )
    );

    expect(plan[0].at).toEqual(new Date("2026-06-12T20:00:00"));
  });
});

describe("buildNotificationPlan — identity", () => {
  it("gives every notification a distinct id that is stable across runs", () => {
    const first = buildNotificationPlan(inputs());
    const second = buildNotificationPlan(
      inputs({ now: new Date("2026-06-10T07:45:00") })
    );

    const ids = first.map((notification) => notification.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(second.map((notification) => notification.id)).toEqual(ids);
    // The native plugin stores ids as 32-bit signed integers.
    expect(Math.max(...ids)).toBeLessThanOrEqual(2 ** 31 - 1);
  });
});

const scheduledFrom = (
  notification: PlannedNotification
): ScheduledNotification => ({
  id: notification.id,
  at: new Date(notification.at),
  title: notification.title,
  body: notification.body,
});

describe("diffNotificationPlan", () => {
  it("schedules everything when nothing is on the device yet", () => {
    const planned = buildNotificationPlan(inputs());

    expect(diffNotificationPlan({ planned, scheduled: [] })).toEqual({
      cancel: [],
      schedule: planned,
    });
  });

  it("does nothing when re-run against what it already scheduled", () => {
    // Re-planning runs on every foreground and history change; it must not
    // duplicate or churn notifications that are already right.
    const planned = buildNotificationPlan(inputs());

    expect(
      diffNotificationPlan({ planned, scheduled: planned.map(scheduledFrom) })
    ).toEqual({ cancel: [], schedule: [] });
  });

  it("cancels a notification the plan no longer wants", () => {
    const before = buildNotificationPlan(inputs());
    const after = buildNotificationPlan(
      inputs({ workoutHistory: [workoutOn("2026-06-10T06:30:00")] })
    );

    const { cancel } = diffNotificationPlan({
      planned: after,
      scheduled: before.map(scheduledFrom),
    });

    const todaysReminder = before.find(
      (notification) =>
        notification.kind === "session_reminder" &&
        localDay(notification.at) === "2026-06-10"
    );
    expect(cancel).toContain(todaysReminder?.id);
  });

  it("replaces a notification whose time or text changed under the same id", () => {
    const before = buildNotificationPlan(inputs());
    const after = buildNotificationPlan(
      inputs({ preferences: { enabled: true, reminderTime: "18:00" } })
    );

    const { cancel, schedule } = diffNotificationPlan({
      planned: after,
      scheduled: before.map(scheduledFrom),
    });

    const changed = after.filter(
      (notification) => notification.kind === "session_reminder"
    );
    expect(schedule).toEqual(expect.arrayContaining(changed));
    expect(cancel).toEqual(
      expect.arrayContaining(changed.map((notification) => notification.id))
    );
  });

  it("clears everything when the plan is empty", () => {
    const before = buildNotificationPlan(inputs());

    expect(
      diffNotificationPlan({ planned: [], scheduled: before.map(scheduledFrom) })
    ).toEqual({
      cancel: before.map((notification) => notification.id),
      schedule: [],
    });
  });
});
