import { useState } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/core/button";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch } from "@/hooks/redux";
import {
  deleteWorkoutExercise,
  replaceWorkoutExercise,
} from "@/state/workout/workoutSlice";
import { formatTime, type WorkoutExercise } from "@/lib/types/workout";

import { applyBreathworkCompletion } from "../data/logging";
import { protocolForExerciseName } from "../data/protocols";
import BreathworkRunner, { type BreathworkResult } from "./BreathworkRunner";

/**
 * In-session card for a breathwork exercise. Instead of weight/reps inputs it
 * offers a single "Breathe" affordance that launches the pacer overlay; each
 * finished run is recorded as one completed timed set on this exercise. Renders
 * nothing for a breathwork-category exercise with no matching protocol — the
 * caller falls back to the standard exercise view in that case.
 */
const BreathworkExerciseCard = ({
  workoutExercise,
}: {
  workoutExercise: WorkoutExercise;
}) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [running, setRunning] = useState(false);

  const protocol = protocolForExerciseName(workoutExercise.exercise.name);
  if (!protocol) return null;

  const completedSets = workoutExercise.sets.filter((set) => set.completed);

  const handleDone = (result: BreathworkResult) => {
    setRunning(false);
    if (result.saveOnExit && result.elapsedSeconds > 0) {
      dispatch(
        replaceWorkoutExercise(
          applyBreathworkCompletion(workoutExercise, result.elapsedSeconds)
        )
      );
      toast({ title: "Breath logged", description: protocol.name });
    }
  };

  return (
    <>
      <div className="stone-surface rounded-[26px] p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="app-kicker">Breathwork</div>
            <h3 className="text-xl font-semibold tracking-tight text-foreground">
              {protocol.name}
            </h3>
            <p className="text-sm text-muted-foreground">{protocol.intent}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => dispatch(deleteWorkoutExercise(workoutExercise.id))}
            aria-label="Remove breathwork"
            className="h-9 shrink-0 rounded-[12px] px-3 text-[13px] font-medium text-foreground/72 hover:bg-white/[0.04] hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {completedSets.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {completedSets.map((set) => (
              <span
                key={set.id}
                className="stone-chip rounded-full px-3 py-1 text-xs tabular-nums text-foreground/85"
              >
                {set.time ? formatTime(set.time) : "—"}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Not yet — tap to breathe.
          </p>
        )}

        <Button
          type="button"
          onClick={() => setRunning(true)}
          className="app-primary-action mt-5 h-11 w-full rounded-[18px] text-sm font-semibold"
        >
          {completedSets.length > 0 ? "Breathe again" : "Breathe"}
        </Button>
      </div>

      {running
        ? createPortal(
            // Portal to the body so the overlay escapes the session list's
            // containing block (the row uses contain:paint + a motion transform,
            // which would otherwise trap and clip this fixed element).
            <div className="fixed inset-0 z-50 flex flex-col bg-background">
              <BreathworkRunner protocol={protocol} onDone={handleDone} />
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export default BreathworkExerciseCard;
