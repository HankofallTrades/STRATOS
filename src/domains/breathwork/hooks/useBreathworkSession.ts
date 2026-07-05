import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildSteps,
  completedUnits,
  shouldSaveEarlyExit,
  totalUnits as computeTotalUnits,
  type BreathStep,
  type BreathworkProtocol,
} from "../data/protocols";

export type BreathworkStatus = "idle" | "running" | "paused" | "retention" | "done";

export interface BreathworkSessionState {
  status: BreathworkStatus;
  /** Current step (null before start / after done). */
  step: BreathStep | null;
  stepIndex: number;
  steps: BreathStep[];
  /** Remaining seconds in the current timed step (ceil). */
  secondsLeft: number;
  /** Count-up seconds during open retention. */
  retentionSeconds: number;
  /** Total session seconds excluding pauses. */
  elapsedSeconds: number;
  unitsCompleted: number;
  totalUnits: number;
  /** Live early-exit save rule: at least one full cycle/round completed. */
  saveOnExit: boolean;
}

export interface BreathworkSessionControls {
  start: () => void;
  pause: () => void;
  resume: () => void;
  /** Ends an open retention hold and advances. */
  tapRetention: () => void;
  /** Early end from any live state -> status 'done'. */
  end: () => void;
}

const TICK_MS = 250;

export const useBreathworkSession = (
  protocol: BreathworkProtocol,
  minutes?: number
): BreathworkSessionState & BreathworkSessionControls => {
  const steps = useMemo(() => buildSteps(protocol, minutes), [protocol, minutes]);

  const [status, setStatus] = useState<BreathworkStatus>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [, setTick] = useState(0);

  const statusRef = useRef<BreathworkStatus>("idle");
  const stepIndexRef = useRef(0);
  const sessionStartedAtRef = useRef(0);
  const stepStartedAtRef = useRef(0);
  const pausedAtRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const finalElapsedRef = useRef(0);

  const transition = useCallback((next: BreathworkStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const liveElapsedSeconds = useCallback((now: number) => {
    return Math.max(
      0,
      (now - sessionStartedAtRef.current - pausedTotalRef.current) / 1000
    );
  }, []);

  const finish = useCallback(
    (now: number) => {
      finalElapsedRef.current = liveElapsedSeconds(now);
      transition("done");
    },
    [liveElapsedSeconds, transition]
  );

  /** Advance past every timed step whose planned time has fully elapsed. */
  const advance = useCallback(
    (now: number) => {
      let index = stepIndexRef.current;
      let stepStart = stepStartedAtRef.current;
      while (index < steps.length) {
        const current = steps[index];
        if (current.seconds == null) break; // open retention waits for a tap
        const stepEnd = stepStart + current.seconds * 1000;
        if (now < stepEnd) break;
        stepStart = stepEnd;
        index += 1;
      }
      if (index !== stepIndexRef.current) {
        stepIndexRef.current = index;
        stepStartedAtRef.current = stepStart;
        setStepIndex(index);
      }
      if (index >= steps.length) {
        finish(now);
        return;
      }
      const kind = steps[index].kind;
      if (kind === "retention" && statusRef.current === "running") {
        transition("retention");
      } else if (kind !== "retention" && statusRef.current === "retention") {
        transition("running");
      }
    },
    [steps, finish, transition]
  );

  useEffect(() => {
    if (status !== "running" && status !== "retention") return;
    const id = setInterval(() => {
      advance(Date.now());
      setTick((tick) => tick + 1);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [status, advance]);

  const start = useCallback(() => {
    if (statusRef.current !== "idle") return;
    const now = Date.now();
    sessionStartedAtRef.current = now;
    stepStartedAtRef.current = now;
    pausedTotalRef.current = 0;
    stepIndexRef.current = 0;
    setStepIndex(0);
    transition(steps[0]?.kind === "retention" ? "retention" : "running");
  }, [steps, transition]);

  const pause = useCallback(() => {
    if (statusRef.current !== "running") return;
    pausedAtRef.current = Date.now();
    transition("paused");
  }, [transition]);

  const resume = useCallback(() => {
    if (statusRef.current !== "paused") return;
    const pausedFor = Date.now() - pausedAtRef.current;
    stepStartedAtRef.current += pausedFor;
    pausedTotalRef.current += pausedFor;
    transition("running");
  }, [transition]);

  const tapRetention = useCallback(() => {
    if (statusRef.current !== "retention") return;
    const now = Date.now();
    const nextIndex = stepIndexRef.current + 1;
    stepIndexRef.current = nextIndex;
    stepStartedAtRef.current = now;
    setStepIndex(nextIndex);
    if (nextIndex >= steps.length) {
      finish(now);
    } else {
      transition("running");
    }
  }, [steps, finish, transition]);

  const end = useCallback(() => {
    const current = statusRef.current;
    if (current !== "running" && current !== "paused" && current !== "retention") return;
    finish(current === "paused" ? pausedAtRef.current : Date.now());
  }, [finish]);

  const now = status === "paused" ? pausedAtRef.current : Date.now();
  const step =
    status === "idle" || stepIndex >= steps.length ? null : steps[stepIndex];

  // Count down in even whole-second ticks. Capping at round(seconds - 0.5) keeps
  // a fractional phase (e.g. coherent's 5.5s) from flashing an extra top number
  // for a split second — the leftover fraction is absorbed into the first tick,
  // so a 5.5s inhale reads a calm "5, 4, 3, 2, 1" instead of a fast "6" then "5".
  const secondsLeft =
    step?.seconds != null
      ? Math.max(
          0,
          Math.min(
            Math.max(1, Math.round(step.seconds - 0.5)),
            Math.ceil((stepStartedAtRef.current + step.seconds * 1000 - now) / 1000)
          )
        )
      : 0;

  const retentionSeconds =
    step?.kind === "retention"
      ? Math.max(0, Math.floor((now - stepStartedAtRef.current) / 1000))
      : 0;

  const elapsedSeconds =
    status === "done"
      ? Math.round(finalElapsedRef.current)
      : status === "idle"
        ? 0
        : Math.round(liveElapsedSeconds(now));

  const effectiveIndex = status === "done" ? stepIndexRef.current : stepIndex;
  const unitsCompleted = completedUnits(protocol, steps, effectiveIndex);
  const total = computeTotalUnits(protocol, minutes);
  const saveOnExit = shouldSaveEarlyExit(protocol, steps, effectiveIndex);

  return {
    status,
    step,
    stepIndex,
    steps,
    secondsLeft,
    retentionSeconds,
    elapsedSeconds,
    unitsCompleted,
    totalUnits: total,
    saveOnExit,
    start,
    pause,
    resume,
    tapRetention,
    end,
  };
};
