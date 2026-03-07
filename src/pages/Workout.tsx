import WorkoutComponent from "@/domains/fitness/view/WorkoutComponent";
import SessionFocusSelector from "@/domains/fitness/view/SessionFocusSelector";
import { useAppSelector, useAppDispatch } from "@/hooks/redux";
import {
  selectCurrentWorkout,
  selectWorkoutStartTime,
  selectSessionFocus,
  startWorkout as startWorkoutAction
} from "@/state/workout/workoutSlice";
import { useElapsedTime } from "@/hooks/useElapsedTime";
import { formatTime } from "@/lib/utils/timeUtils";
import { Clock, ChevronDown } from "lucide-react";
import { Button } from "@/components/core/button";
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
import { Textarea } from "@/components/core/textarea";
import { Progress } from "@/components/core/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/core/select";
import { Barbell } from "@phosphor-icons/react";
import { CardioSet, SessionFocus, StrengthSet, WorkoutExercise, isCardioExercise, secondsToTime } from "@/lib/types/workout";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/state/auth/AuthProvider";
import { useWorkoutPersistence } from "@/domains/fitness/controller/useWorkout";
import { usePeriodization } from "@/domains/periodization";
import type { MesocycleProtocol, MesocycleSessionTemplate } from "@/domains/periodization";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";

const sessionFocusOptions: SessionFocus[] = [
  'hypertrophy',
  'strength',
  'zone2',
  'zone5',
  'speed',
  'recovery',
  'mixed',
];

const formatSessionFocusLabel = (focus: SessionFocus) => {
  const labels: Record<SessionFocus, string> = {
    hypertrophy: 'Hypertrophy',
    strength: 'Strength',
    zone2: 'Zone 2',
    zone5: 'Zone 5',
    speed: 'Speed',
    recovery: 'Recovery',
    mixed: 'Mixed',
  };
  return labels[focus];
};

const formatProtocolLabel = (protocol: MesocycleProtocol) => {
  return protocol === 'occams' ? "Occam's" : 'Custom';
};

const builderLabelClassName = "text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground";
const builderInputClassName = "app-form-input stone-inset h-11 rounded-[16px] border-0 px-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0";
const builderTextareaClassName = "app-form-input stone-inset min-h-[96px] rounded-[16px] border-0 px-3 py-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0";
const builderSelectTriggerClassName = "app-form-select stone-inset h-11 rounded-[16px] border-0 px-3 text-sm focus:ring-0 focus:ring-offset-0";
const builderSelectContentClassName = "stone-surface border-white/8 text-foreground";
const builderSelectItemClassName = "rounded-[12px] py-2.5 pl-8 pr-3 text-sm text-foreground/88 focus:bg-white/[0.04] focus:text-foreground";

const getOccamsExercisePrescription = (
  exerciseName: string
): { equipmentType: string; variation: string } | null => {
  const normalized = exerciseName.trim().toLowerCase();

  if (
    normalized === 'pulldown' ||
    normalized === 'close-grip supinated pulldown'
  ) {
    return { equipmentType: 'Machine', variation: 'Supinated' };
  }

  if (
    normalized === 'shoulder press' ||
    normalized === 'machine shoulder press' ||
    normalized === 'leg press'
  ) {
    return { equipmentType: 'Machine', variation: 'Standard' };
  }

  if (normalized === 'chest press' || normalized === 'slight incline chest press') {
    return { equipmentType: 'Machine', variation: 'Incline' };
  }

  return null;
};

const Workout = () => {
  const dispatch = useAppDispatch();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const workoutStartTime = useAppSelector(selectWorkoutStartTime);
  const sessionFocus = useAppSelector(selectSessionFocus);
  const displayTime = useElapsedTime(workoutStartTime);
  const [selectedFocus, setSelectedFocus] = useState<SessionFocus | null>(null);
  const [customSessionFocus, setCustomSessionFocus] = useState<SessionFocus | null>(null);
  const { user } = useAuth();
  const {
    activeProgram,
    isLoading: isLoadingMesocycle,
    createMesocycle,
    isCreatingMesocycle,
    createCustomSession,
    isCreatingCustomSession,
  } = usePeriodization(user?.id);

  const [mesocycleName, setMesocycleName] = useState("Hypertrophy Block");
  const [mesocycleDurationWeeks, setMesocycleDurationWeeks] = useState(6);
  const [mesocycleGoalFocus, setMesocycleGoalFocus] = useState<SessionFocus>('hypertrophy');
  const [mesocycleProtocol, setMesocycleProtocol] = useState<MesocycleProtocol>('occams');
  const [mesocycleNotes, setMesocycleNotes] = useState('');
  const [showBlockBuilder, setShowBlockBuilder] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const { saveWorkout, discardWorkout } = useWorkoutPersistence();

  const nextOccamSession = activeProgram?.sessions.find(session => session.id === activeProgram.next_session_id)
    ?? activeProgram?.sessions[0]
    ?? null;
  const periodProgressValue = activeProgram
    ? Math.round((activeProgram.current_week / activeProgram.mesocycle.duration_weeks) * 100)
    : 0;

  const buildExercisesFromSessionTemplate = (sessionTemplate: MesocycleSessionTemplate): WorkoutExercise[] => {
    return sessionTemplate.exercises
      .filter(row => !!row.exercise)
      .map(row => {
        const exercise = row.exercise!;
        const setCount = row.target_sets ?? sessionTemplate.sets_per_exercise ?? 2;
        const occamsPrescription = getOccamsExercisePrescription(exercise.name);
        const targetEquipmentType = occamsPrescription?.equipmentType ?? exercise.default_equipment_type ?? 'Machine';
        const targetVariation = occamsPrescription?.variation ?? 'Standard';

        if (isCardioExercise(exercise)) {
          const cardioSets: CardioSet[] = Array.from({ length: setCount }, () => ({
            id: uuidv4(),
            exerciseId: exercise.id,
            time: secondsToTime(300),
            completed: false,
          }));

          return {
            id: uuidv4(),
            exerciseId: exercise.id,
            exercise,
            sets: cardioSets,
          };
        }

        const strengthSets: StrengthSet[] = Array.from({ length: setCount }, () => ({
          id: uuidv4(),
          exerciseId: exercise.id,
          weight: 0,
          reps: exercise.is_static ? null : 0,
          time: exercise.is_static ? secondsToTime(30) : null,
          completed: false,
          variation: targetVariation,
          equipmentType: targetEquipmentType,
        }));

        return {
          id: uuidv4(),
          exerciseId: exercise.id,
          exercise,
          equipmentType: targetEquipmentType,
          variation: targetVariation,
          sets: strengthSets,
        };
      });
  };

  const handleStartWorkout = () => {
    dispatch(startWorkoutAction({
      sessionFocus: selectedFocus || undefined
    }));
  };

  const handleCreateMesocycle = async () => {
    const duration = Number(mesocycleDurationWeeks);
    if (!Number.isFinite(duration) || duration < 4 || duration > 12) {
      toast({
        title: "Invalid duration",
        description: "Mesocycles must be between 4 and 12 weeks.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createMesocycle({
        name: mesocycleName.trim() || 'Mesocycle',
        goal_focus: mesocycleGoalFocus,
        protocol: mesocycleProtocol,
        start_date: new Date().toISOString().split('T')[0],
        duration_weeks: duration,
        notes: mesocycleNotes.trim() || undefined,
      });
      toast({
        title: "Mesocycle created",
        description: "Your periodization block is ready.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create mesocycle.';
      toast({
        title: "Creation failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleStartProtocolSession = (sessionTemplate: MesocycleSessionTemplate) => {
    if (!activeProgram) return;

    dispatch(startWorkoutAction({
      sessionFocus: (sessionTemplate.session_focus ?? activeProgram.mesocycle.goal_focus) as SessionFocus,
      mesocycleId: activeProgram.mesocycle.id,
      mesocycleSessionId: sessionTemplate.id,
      mesocycleWeek: activeProgram.current_week,
      mesocycleProtocol: activeProgram.mesocycle.protocol,
      initialExercises: buildExercisesFromSessionTemplate(sessionTemplate),
    }));
  };

  const handleStartNextProtocolSession = () => {
    if (!nextOccamSession) return;
    handleStartProtocolSession(nextOccamSession);
  };

  const handleStartCustomMesocycleSession = async () => {
    if (!activeProgram) return;
    const resolvedSessionFocus = customSessionFocus ?? activeProgram.mesocycle.goal_focus;

    try {
      const createdSession = await createCustomSession({
        mesocycleId: activeProgram.mesocycle.id,
        sessionFocus: resolvedSessionFocus,
      });

      dispatch(startWorkoutAction({
        sessionFocus: resolvedSessionFocus,
        mesocycleId: activeProgram.mesocycle.id,
        mesocycleSessionId: createdSession.id,
        mesocycleWeek: activeProgram.current_week,
        mesocycleProtocol: activeProgram.mesocycle.protocol,
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create custom session.';
      toast({
        title: "Could not start custom session",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleFocusSelect = (focus: SessionFocus) => {
    setSelectedFocus(focus);
  };

  const handleEndWorkout = async () => {
    const hasCompletedSets = currentWorkout?.exercises.some((exercise) =>
      exercise.sets.some((set) => set.completed)
    );

    if (!hasCompletedSets) {
      setIsDiscardConfirmOpen(true);
      return;
    }

    await saveWorkout();
  };

  const handleConfirmDiscard = () => {
    discardWorkout();
    setIsDiscardConfirmOpen(false);
  };

  const getFocusDisplayInfo = (focus: SessionFocus) => {
    const focusMap = {
      strength: {
        title: 'Strength',
        color: 'verdigris-text',
      },
      hypertrophy: {
        title: 'Hypertrophy',
        color: 'verdigris-text',
      },
      zone2: {
        title: 'Endurance',
        color: 'verdigris-text',
      },
      zone5: {
        title: 'Max HR',
        color: 'verdigris-text',
      },
      speed: {
        title: 'Speed & Power',
        color: 'verdigris-text',
      },
      recovery: {
        title: 'Recovery',
        color: 'verdigris-text',
      },
      mixed: {
        title: 'Mixed',
        color: 'verdigris-text',
      },
    };
    return focusMap[focus] || { title: focus, color: 'verdigris-text' };
  };

  if (!currentWorkout) {
    const usesOccamsProtocol =
      activeProgram?.mesocycle.protocol === 'occams' && activeProgram.sessions.length > 0;

    return (
      <div className="stone-workout-page min-h-svh w-full">
        <div className="mx-auto flex min-h-svh w-full max-w-[72rem] flex-col px-4 pb-8 pt-5 sm:px-6 lg:px-8">
          {isLoadingMesocycle ? (
            <section className="stone-panel stone-panel-hero rounded-[28px] p-6 md:p-7">
              <div className="flex items-center gap-3">
                <Barbell size={18} className="verdigris-text" />
                <div className="app-kicker">Loading</div>
              </div>
              <h1 className="mt-3 text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-none tracking-tight text-foreground">
                Preparing your session.
              </h1>
            </section>
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
                    <span>Week {activeProgram.current_week} / {activeProgram.mesocycle.duration_weeks}</span>
                  </div>
                  <Progress value={periodProgressValue} className="h-2 bg-white/[0.05] [&>div]:bg-[var(--stone-accent)]" />
                </div>

                {usesOccamsProtocol ? (
                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={handleStartNextProtocolSession}
                      className="app-primary-action h-11 w-full rounded-[18px] px-6 text-base font-semibold sm:w-auto"
                    >
                      Start
                    </Button>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    <SessionFocusSelector
                      onSelectFocus={setCustomSessionFocus}
                      selectedFocus={customSessionFocus ?? activeProgram.mesocycle.goal_focus}
                      compact={true}
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleStartCustomMesocycleSession}
                        disabled={isCreatingCustomSession}
                        className="app-primary-action h-11 w-full rounded-[18px] px-6 text-base font-semibold sm:w-auto"
                      >
                        {isCreatingCustomSession ? 'Starting...' : 'Start'}
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
                    onSelectFocus={handleFocusSelect}
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
                    onSelectFocus={handleFocusSelect}
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
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">Build a block.</h2>
                    <p className="text-sm text-muted-foreground">Create a mesocycle when you want structure.</p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setShowBlockBuilder((previous) => !previous)}
                    className="app-tonal-control h-10 shrink-0 rounded-[16px] px-4 text-sm font-medium"
                  >
                    {showBlockBuilder ? 'Hide' : 'Open'}
                    <ChevronDown className={cn("h-4 w-4 transition-transform", showBlockBuilder && "rotate-180")} />
                  </Button>
                </div>

                {showBlockBuilder ? (
                  <div className="mt-5 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="mesocycle-name" className={builderLabelClassName}>Block Name</Label>
                      <Input
                        id="mesocycle-name"
                        value={mesocycleName}
                        onChange={(event) => setMesocycleName(event.target.value)}
                        placeholder="e.g. 6-Week Hypertrophy"
                        className={builderInputClassName}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="mesocycle-duration" className={builderLabelClassName}>Duration</Label>
                        <Input
                          id="mesocycle-duration"
                          type="number"
                          min={4}
                          max={12}
                          value={mesocycleDurationWeeks}
                          onChange={(event) => setMesocycleDurationWeeks(Number(event.target.value))}
                          className={builderInputClassName}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mesocycle-protocol" className={builderLabelClassName}>Protocol</Label>
                        <Select
                          value={mesocycleProtocol}
                          onValueChange={(value) => setMesocycleProtocol(value as MesocycleProtocol)}
                        >
                          <SelectTrigger id="mesocycle-protocol" className={builderSelectTriggerClassName}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={builderSelectContentClassName}>
                            <SelectItem value="occams" className={builderSelectItemClassName}>Occam&apos;s Protocol</SelectItem>
                            <SelectItem value="custom" className={builderSelectItemClassName}>Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mesocycle-focus" className={builderLabelClassName}>Primary Focus</Label>
                      <Select
                        value={mesocycleGoalFocus}
                        onValueChange={(value) => setMesocycleGoalFocus(value as SessionFocus)}
                      >
                        <SelectTrigger id="mesocycle-focus" className={builderSelectTriggerClassName}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={builderSelectContentClassName}>
                          {sessionFocusOptions.map(option => (
                            <SelectItem key={option} value={option} className={builderSelectItemClassName}>
                              {formatSessionFocusLabel(option)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mesocycle-notes" className={builderLabelClassName}>Notes</Label>
                      <Textarea
                        id="mesocycle-notes"
                        value={mesocycleNotes}
                        onChange={(event) => setMesocycleNotes(event.target.value)}
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
                      {isCreatingMesocycle ? 'Creating...' : 'Create Mesocycle'}
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

  const focusInfo = sessionFocus ? getFocusDisplayInfo(sessionFocus) : null;

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
              You haven't completed any sets in this workout. Are you sure you want to discard it?
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
              <Button variant="destructive" onClick={handleConfirmDiscard} className="rounded-[16px]">
                Discard
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Workout;
