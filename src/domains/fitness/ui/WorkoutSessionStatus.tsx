import { Clock, Play, Square } from "lucide-react";

import { useAppSelector } from "@/hooks/redux";
import { useElapsedTime } from "@/hooks/useElapsedTime";
import { getFocusDisplayInfo } from "@/domains/fitness/data/workoutScreen";
import { cn } from "@/lib/utils/cn";
import { formatTime } from "@/lib/utils/timeUtils";
import {
  selectCurrentWorkout,
  selectSessionFocus,
  selectWarmupSeconds,
  selectWarmupStartTime,
  selectWorkoutStartTime,
} from "@/state/workout/workoutSlice";

interface WorkoutSessionStatusProps {
  onStartWarmup: () => void;
  onStopWarmup: () => void;
}

const WorkoutSessionStatus = ({
  onStartWarmup,
  onStopWarmup,
}: WorkoutSessionStatusProps) => {
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const sessionFocus = useAppSelector(selectSessionFocus);
  const workoutStartTime = useAppSelector(selectWorkoutStartTime);
  const warmupStartTime = useAppSelector(selectWarmupStartTime);
  const warmupSeconds = useAppSelector(selectWarmupSeconds);
  const displayTime = useElapsedTime(workoutStartTime);
  const warmupElapsed = useElapsedTime(warmupStartTime);
  const focusInfo = sessionFocus ? getFocusDisplayInfo(sessionFocus) : null;

  if (!currentWorkout) {
    return null;
  }

  return (
    <>
      <div className="stone-panel stone-panel-hero mb-6 flex shrink-0 items-center justify-between gap-3 rounded-[20px] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Clock className="h-5 w-5 shrink-0 verdigris-text" />
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Session
            </div>
            <span className="text-[clamp(1.75rem,5vw,2.25rem)] font-medium leading-none text-foreground">
              {formatTime(
                currentWorkout.completed ? currentWorkout.duration : displayTime
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {focusInfo ? (
            <div className={cn("text-sm font-medium", focusInfo.color)}>
              {focusInfo.title}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-[16px] stone-surface px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Warmup
        </div>
        {warmupStartTime ? (
          <>
            <span className="text-lg font-medium tabular-nums text-foreground">
              {formatTime(warmupElapsed)}
            </span>
            <button
              onClick={onStopWarmup}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-[10px] bg-rose-500/12 text-rose-400 transition-colors hover:bg-rose-500/20"
              aria-label="Stop warmup"
            >
              <Square size={14} className="fill-current" />
            </button>
          </>
        ) : warmupSeconds ? (
          <span className="text-sm font-medium text-foreground/60">
            {formatTime(warmupSeconds)}
          </span>
        ) : (
          <button
            onClick={onStartWarmup}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/[0.04] text-foreground/60 transition-colors hover:bg-white/[0.08] hover:text-foreground"
            aria-label="Start warmup"
          >
            <Play size={14} className="fill-current" />
          </button>
        )}
      </div>
    </>
  );
};

export default WorkoutSessionStatus;
