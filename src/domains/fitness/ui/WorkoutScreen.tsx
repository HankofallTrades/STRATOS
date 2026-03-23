import { Barbell } from "@phosphor-icons/react";
import { ChevronDown, Clock, Play, Square } from "lucide-react";

import { Button } from "@/components/core/button";
import { Skeleton } from "@/components/core/skeleton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/core/Dialog";
import { Input } from "@/components/core/input";
import { Label } from "@/components/core/label";
import { Progress } from "@/components/core/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/core/select";
import { Textarea } from "@/components/core/textarea";
import { useWorkoutScreen } from "@/domains/fitness/hooks/useWorkoutScreen";
import type { MesocycleProtocol } from "@/domains/periodization";
import SessionFocusSelector from "@/domains/fitness/ui/SessionFocusSelector";
import WorkoutComponent from "@/domains/fitness/ui/WorkoutComponent";
import {
  formatProtocolLabel,
  formatSessionFocusLabel,
  sessionFocusOptions,
} from "@/domains/fitness/data/workoutScreen";
import { formatTime } from "@/lib/utils/timeUtils";
import { cn } from "@/lib/utils/cn";

const builderLabelClassName =
  "text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground";
const builderInputClassName =
  "app-form-input stone-inset h-11 rounded-[16px] border-0 px-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0";
const builderTextareaClassName =
  "app-form-input stone-inset min-h-[96px] rounded-[16px] border-0 px-3 py-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0";
const builderSelectTriggerClassName =
  "app-form-select stone-inset h-11 rounded-[16px] border-0 px-3 text-sm focus:ring-0 focus:ring-offset-0";
const builderSelectContentClassName =
  "stone-surface border-white/8 text-foreground";
const builderSelectItemClassName =
  "rounded-[12px] py-2.5 pl-8 pr-3 text-sm text-foreground/88 focus:bg-white/[0.04] focus:text-foreground";

const WorkoutScreen = () => {
  const {
    currentWorkout,
    displayTime,
    warmupStartTime,
    warmupElapsed,
    warmupSeconds,
    selectedFocus,
    customSessionFocus,
    mesocycleName,
    mesocycleDurationWeeks,
    mesocycleGoalFocus,
    mesocycleProtocol,
    mesocycleNotes,
    showBlockBuilder,
    isDiscardConfirmOpen,
    activeProgram,
    isLoadingMesocycle,
    isCreatingMesocycle,
    isCreatingCustomSession,
    nextProgramSession,
    periodProgressValue,
    focusInfo,
    setSelectedFocus,
    setCustomSessionFocus,
    setMesocycleName,
    setMesocycleDurationWeeks,
    setMesocycleGoalFocus,
    setMesocycleProtocol,
    setMesocycleNotes,
    setShowBlockBuilder,
    setIsDiscardConfirmOpen,
    handleStartWorkout,
    handleCreateMesocycle,
    handleStartNextProtocolSession,
    handleStartCustomMesocycleSession,
    handleEndWorkout,
    handleConfirmDiscard,
    handleStartWarmup,
    handleStopWarmup,
  } = useWorkoutScreen();

  if (!currentWorkout) {
    const usesProgramSessions = nextProgramSession !== null;

    return (
      <div className="stone-workout-page min-h-svh w-full">
        <div className="mx-auto flex min-h-svh w-full max-w-[72rem] flex-col px-4 pb-8 pt-5 sm:px-6 lg:px-8">
          {isLoadingMesocycle ? (
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.92fr)]">
              <section className="stone-panel stone-panel-hero overflow-hidden rounded-[28px] p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-[18px] w-[18px] rounded" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="mt-3">
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
                <div className="mt-6 flex justify-end">
                  <Skeleton className="h-11 w-full rounded-[18px] sm:w-44" />
                </div>
              </section>
              <section className="stone-surface rounded-[26px] p-5 md:p-6">
                <Skeleton className="h-3 w-16" />
                <div className="mt-5 space-y-4">
                  <Skeleton className="h-10 w-full rounded-[16px]" />
                  <Skeleton className="h-11 w-full rounded-[18px]" />
                </div>
              </section>
            </div>
          ) : activeProgram ? (
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.92fr)]">
              <section className="stone-panel stone-panel-hero overflow-hidden rounded-[28px] p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <Barbell size={18} className="verdigris-text" />
                  <div className="app-kicker">{activeProgram.mesocycle.name}</div>
                </div>
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground">
                    {formatProtocolLabel(activeProgram.mesocycle.protocol)}
                  </p>
                </div>

                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Week {activeProgram.current_week} /{" "}
                      {activeProgram.mesocycle.duration_weeks}
                    </span>
                  </div>
                  <Progress
                    value={periodProgressValue}
                    className="h-2 bg-white/[0.05] [&>div]:bg-[var(--stone-accent)]"
                  />
                </div>

                {usesProgramSessions ? (
                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={handleStartNextProtocolSession}
                      className="app-primary-action h-11 w-full rounded-[18px] px-6 text-base font-semibold sm:w-auto"
                    >
                      {nextProgramSession?.name
                        ? `Start ${nextProgramSession.name}`
                        : "Start"}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    <SessionFocusSelector
                      onSelectFocus={setCustomSessionFocus}
                      selectedFocus={
                        customSessionFocus ?? activeProgram.mesocycle.goal_focus
                      }
                      compact={true}
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleStartCustomMesocycleSession}
                        disabled={isCreatingCustomSession}
                        className="app-primary-action h-11 w-full rounded-[18px] px-6 text-base font-semibold sm:w-auto"
                      >
                        {isCreatingCustomSession ? "Starting..." : "Start"}
                      </Button>
                    </div>
                  </div>
                )}
              </section>

              <section className="stone-surface rounded-[26px] p-5 md:p-6">
                <div className="space-y-1">
                  <div className="app-kicker">One-Off</div>
                </div>

                <div className="mt-5 space-y-4">
                  <SessionFocusSelector
                    onSelectFocus={setSelectedFocus}
                    selectedFocus={selectedFocus}
                    compact={true}
                  />
                  <Button
                    onClick={handleStartWorkout}
                    variant="ghost"
                    className="app-tonal-control h-11 w-full rounded-[18px] px-5 text-sm font-semibold text-foreground"
                  >
                    Start
                  </Button>
                </div>
              </section>
            </div>
          ) : (
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.92fr)]">
              <section className="stone-panel stone-panel-hero overflow-hidden rounded-[28px] p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <Barbell size={18} className="verdigris-text" />
                  <div className="app-kicker">Quick Start</div>
                </div>
                <div className="mt-3">
                  <h1 className="text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-none tracking-tight text-foreground">
                    Start training now.
                  </h1>
                </div>

                <div className="mt-6 space-y-4">
                  <SessionFocusSelector
                    onSelectFocus={setSelectedFocus}
                    selectedFocus={selectedFocus}
                    compact={true}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleStartWorkout}
                      className="app-primary-action h-11 w-full rounded-[18px] px-6 text-base font-semibold sm:w-auto"
                    >
                      Start
                    </Button>
                  </div>
                </div>
              </section>

              <section className="stone-surface rounded-[26px] p-5 md:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="app-kicker">Program</div>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                      Build a block.
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Create a mesocycle when you want structure.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setShowBlockBuilder(previous => !previous)}
                    className="app-tonal-control h-10 shrink-0 rounded-[16px] px-4 text-sm font-medium"
                  >
                    {showBlockBuilder ? "Hide" : "Open"}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        showBlockBuilder && "rotate-180"
                      )}
                    />
                  </Button>
                </div>

                {showBlockBuilder ? (
                  <div className="mt-5 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="mesocycle-name" className={builderLabelClassName}>
                        Block Name
                      </Label>
                      <Input
                        id="mesocycle-name"
                        value={mesocycleName}
                        onChange={event => setMesocycleName(event.target.value)}
                        placeholder="e.g. 6-Week Hypertrophy"
                        className={builderInputClassName}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="mesocycle-duration" className={builderLabelClassName}>
                          Duration
                        </Label>
                        <Input
                          id="mesocycle-duration"
                          type="number"
                          min={4}
                          max={12}
                          value={mesocycleDurationWeeks}
                          onChange={event =>
                            setMesocycleDurationWeeks(Number(event.target.value))
                          }
                          className={builderInputClassName}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mesocycle-protocol" className={builderLabelClassName}>
                          Protocol
                        </Label>
                        <Select
                          value={mesocycleProtocol}
                          onValueChange={value =>
                            setMesocycleProtocol(value as MesocycleProtocol)
                          }
                        >
                          <SelectTrigger
                            id="mesocycle-protocol"
                            className={builderSelectTriggerClassName}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={builderSelectContentClassName}>
                            <SelectItem
                              value="occams"
                              className={builderSelectItemClassName}
                            >
                              Occam&apos;s Protocol
                            </SelectItem>
                            <SelectItem
                              value="custom"
                              className={builderSelectItemClassName}
                            >
                              Custom
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mesocycle-focus" className={builderLabelClassName}>
                        Primary Focus
                      </Label>
                      <Select
                        value={mesocycleGoalFocus}
                        onValueChange={value =>
                          setMesocycleGoalFocus(value as typeof mesocycleGoalFocus)
                        }
                      >
                        <SelectTrigger
                          id="mesocycle-focus"
                          className={builderSelectTriggerClassName}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={builderSelectContentClassName}>
                          {sessionFocusOptions.map(option => (
                            <SelectItem
                              key={option}
                              value={option}
                              className={builderSelectItemClassName}
                            >
                              {formatSessionFocusLabel(option)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mesocycle-notes" className={builderLabelClassName}>
                        Notes
                      </Label>
                      <Textarea
                        id="mesocycle-notes"
                        value={mesocycleNotes}
                        onChange={event => setMesocycleNotes(event.target.value)}
                        placeholder="Constraints, priorities, weekly targets..."
                        rows={4}
                        className={builderTextareaClassName}
                      />
                    </div>

                    <Button
                      onClick={handleCreateMesocycle}
                      disabled={isCreatingMesocycle}
                      className="app-primary-action h-11 w-full rounded-[18px] text-sm font-semibold"
                    >
                      {isCreatingMesocycle ? "Creating..." : "Create Mesocycle"}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-muted-foreground">
                    4-12 weeks, one primary focus, and an optional note.
                  </p>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="stone-workout-page min-h-svh w-full">
      <div className="mx-auto flex min-h-svh w-full max-w-[72rem] flex-col px-4 pb-6 pt-4 sm:px-6 lg:px-8">
        <div className="stone-panel stone-panel-hero mb-6 flex shrink-0 items-center justify-between gap-3 rounded-[20px] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Clock className="h-5 w-5 shrink-0 verdigris-text" />
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Session
              </div>
              <span className="text-[clamp(1.75rem,5vw,2.25rem)] font-medium leading-none text-foreground">
                {formatTime(currentWorkout.completed ? currentWorkout.duration : displayTime)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {focusInfo && (
              <div className={cn("text-sm font-medium", focusInfo.color)}>
                {focusInfo.title}
              </div>
            )}
          </div>
        </div>

        {/* Warmup Timer */}
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
                onClick={handleStopWarmup}
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
              onClick={handleStartWarmup}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/[0.04] text-foreground/60 transition-colors hover:bg-white/[0.08] hover:text-foreground"
              aria-label="Start warmup"
            >
              <Play size={14} className="fill-current" />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1">
          <WorkoutComponent />
        </div>

        <div className="mt-4 flex shrink-0 justify-end border-t stone-seam pt-4">
          <Button
            onClick={handleEndWorkout}
            variant="ghost"
            className="h-10 rounded-[10px] border-0 bg-transparent px-0 text-sm font-medium shadow-none hover:bg-transparent"
          >
            <span className="verdigris-text">Finish</span>
          </Button>
        </div>
      </div>

      <Dialog open={isDiscardConfirmOpen} onOpenChange={setIsDiscardConfirmOpen}>
        <DialogContent className="stone-panel rounded-[24px] border-white/10">
          <DialogHeader>
            <DialogTitle>Discard Workout?</DialogTitle>
            <DialogDescription>
              You haven&apos;t completed any sets in this workout. Are you sure you
              want to discard it?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsDiscardConfirmOpen(false)}
              className="stone-chip rounded-[16px] px-4 hover:bg-white/[0.05]"
            >
              Cancel
            </Button>
            <DialogClose asChild>
              <Button
                variant="destructive"
                onClick={handleConfirmDiscard}
                className="rounded-[16px]"
              >
                Discard
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkoutScreen;
