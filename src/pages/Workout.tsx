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
  const [showQuickStart, setShowQuickStart] = useState(false);
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
        color: 'warm-metal-text',
      },
      hypertrophy: {
        title: 'Hypertrophy',
        color: 'warm-metal-text',
      },
      zone2: {
        title: 'Endurance',
        color: 'warm-metal-text',
      },
      zone5: {
        title: 'Max HR',
        color: 'warm-metal-text',
      },
      speed: {
        title: 'Speed & Power',
        color: 'warm-metal-text',
      },
      recovery: {
        title: 'Recovery',
        color: 'warm-metal-text',
      },
      mixed: {
        title: 'Mixed',
        color: 'warm-metal-text',
      },
    };
    return focusMap[focus] || { title: focus, color: 'warm-metal-text' };
  };

  if (!currentWorkout) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center h-full">
        <div className="w-full max-w-2xl">
          <div className="flex flex-col py-8 px-6 bg-card border border-border rounded-lg shadow-sm w-full space-y-6">
            <div className="flex flex-col items-center text-center">
              <Barbell size={64} className="text-primary mb-4" />
              <h2 className="text-2xl font-semibold mb-2 text-card-foreground">Ready to start your session?</h2>
              <p className="text-muted-foreground">
                Manage your current period and launch today&apos;s workout from one place.
              </p>
            </div>

            {isLoadingMesocycle ? (
              <div className="py-5 px-6 border border-border/70 rounded-lg bg-background/40">
                <p className="text-sm text-muted-foreground">Loading mesocycle...</p>
              </div>
            ) : activeProgram ? (
              <div className="space-y-4">
                <div className="py-4 px-5 border border-primary/25 rounded-lg bg-primary/5 space-y-3">
                  <div className="flex items-start gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-card-foreground">{activeProgram.mesocycle.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Focus: {formatSessionFocusLabel(activeProgram.mesocycle.goal_focus)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Block Progress</span>
                      <span>Week {activeProgram.current_week} / {activeProgram.mesocycle.duration_weeks}</span>
                    </div>
                    <Progress value={periodProgressValue} className="h-2 bg-primary/15" />
                  </div>
                </div>

                {activeProgram.mesocycle.protocol === 'occams' && activeProgram.sessions.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Next workout: <span className="text-foreground font-semibold">{nextOccamSession?.name ?? 'Occam A'}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      1 hard set to failure, 5s up / 5s down, then recover 2-4+ days.
                    </p>
                    {activeProgram.last_completed_session_id && (
                      <p className="text-xs text-muted-foreground">
                        Last completed:{' '}
                        {activeProgram.sessions.find(session => session.id === activeProgram.last_completed_session_id)?.name ?? 'Unknown'}
                      </p>
                    )}

                    <Button onClick={handleStartNextProtocolSession} className="w-full">
                      Start Next ({nextOccamSession?.name ?? 'Occam A'})
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Choose a focus if you want to override the block focus for this custom session.
                    </p>
                    <div className="relative z-0">
                      <SessionFocusSelector
                        onSelectFocus={setCustomSessionFocus}
                        selectedFocus={customSessionFocus ?? activeProgram.mesocycle.goal_focus}
                        compact={true}
                        label="Session Focus"
                        helperText="This sets today&apos;s custom session focus. Leave it as-is to use your block default."
                      />
                    </div>
                    <Button
                      onClick={handleStartCustomMesocycleSession}
                      disabled={isCreatingCustomSession}
                      className="w-full"
                    >
                      {isCreatingCustomSession ? 'Starting...' : 'Start Custom Session'}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-card-foreground">Create a Mesocycle</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Build a focused 4-12 week block with either Occam&apos;s or a custom protocol.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mesocycle-name">Block Name</Label>
                  <Input
                    id="mesocycle-name"
                    value={mesocycleName}
                    onChange={(event) => setMesocycleName(event.target.value)}
                    placeholder="e.g. 6-Week Hypertrophy"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="mesocycle-duration">Duration (weeks)</Label>
                    <Input
                      id="mesocycle-duration"
                      type="number"
                      min={4}
                      max={12}
                      value={mesocycleDurationWeeks}
                      onChange={(event) => setMesocycleDurationWeeks(Number(event.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mesocycle-protocol">Protocol</Label>
                    <select
                      id="mesocycle-protocol"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={mesocycleProtocol}
                      onChange={(event) => setMesocycleProtocol(event.target.value as MesocycleProtocol)}
                    >
                      <option value="occams">Occam&apos;s Protocol</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mesocycle-focus">Primary Focus</Label>
                  <select
                    id="mesocycle-focus"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={mesocycleGoalFocus}
                    onChange={(event) => setMesocycleGoalFocus(event.target.value as SessionFocus)}
                  >
                    {sessionFocusOptions.map(option => (
                      <option key={option} value={option}>
                        {formatSessionFocusLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mesocycle-notes">Notes (optional)</Label>
                  <Textarea
                    id="mesocycle-notes"
                    value={mesocycleNotes}
                    onChange={(event) => setMesocycleNotes(event.target.value)}
                    placeholder="Constraints, priorities, weekly targets..."
                    rows={3}
                  />
                </div>

                <Button onClick={handleCreateMesocycle} disabled={isCreatingMesocycle} className="w-full">
                  {isCreatingMesocycle ? 'Creating...' : 'Create Mesocycle'}
                </Button>
              </div>
            )}

            <div className="border-t border-border pt-5 space-y-4">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  onClick={() => setShowQuickStart(previous => !previous)}
                  className="w-full justify-between text-muted-foreground hover:text-foreground"
                >
                  <span>Start a Different Session</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showQuickStart && "rotate-180")} />
                </Button>
                <p className="text-xs text-muted-foreground px-1">
                  One-off workout outside your current block.
                </p>
              </div>

              {showQuickStart && (
                <div className="space-y-4 pt-2">
                  <div className="relative z-0">
                    <SessionFocusSelector
                      onSelectFocus={handleFocusSelect}
                      selectedFocus={selectedFocus}
                      compact={true}
                      label="Training Focus"
                      helperText="Pick one to tag this session. If you skip it, the workout starts without a focus tag."
                    />
                  </div>

                  <Button
                    onClick={handleStartWorkout}
                    size="lg"
                    variant="outline"
                    className="font-semibold w-full"
                  >
                    Start Different Session
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const focusInfo = sessionFocus ? getFocusDisplayInfo(sessionFocus) : null;

  return (
    <div className="stone-workout-page app-workout-page w-full">
      <div className="app-workout-frame mx-auto flex min-h-svh w-full max-w-[72rem] flex-col">
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
