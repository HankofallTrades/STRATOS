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
import { Clock, Heart, Zap, Dumbbell, Flame } from "lucide-react";
import { Button } from "@/components/core/button";
import { Badge } from "@/components/core/badge";
import { Input } from "@/components/core/input";
import { Label } from "@/components/core/label";
import { Textarea } from "@/components/core/textarea";
import { Barbell } from "@phosphor-icons/react";
import { CardioSet, SessionFocus, StrengthSet, WorkoutExercise, isCardioExercise, secondsToTime } from "@/lib/types/workout";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/state/auth/AuthProvider";
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

const parseRepTarget = (value?: string | null): number | null => {
  if (!value) return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
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

        const repTarget = parseRepTarget(row.target_reps ?? sessionTemplate.rep_range) ?? 8;
        const strengthSets: StrengthSet[] = Array.from({ length: setCount }, () => ({
          id: uuidv4(),
          exerciseId: exercise.id,
          weight: 0,
          reps: exercise.is_static ? null : repTarget,
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
      initialExercises: buildExercisesFromSessionTemplate(sessionTemplate),
    }));
  };

  const handleStartNextProtocolSession = () => {
    if (!activeProgram || activeProgram.sessions.length === 0) return;
    const nextSession = activeProgram.sessions.find(session => session.id === activeProgram.next_session_id)
      ?? activeProgram.sessions[0];
    handleStartProtocolSession(nextSession);
  };

  const handleStartCustomMesocycleSession = async () => {
    if (!activeProgram) return;

    try {
      const createdSession = await createCustomSession({
        mesocycleId: activeProgram.mesocycle.id,
        sessionFocus: activeProgram.mesocycle.goal_focus,
      });

      dispatch(startWorkoutAction({
        sessionFocus: activeProgram.mesocycle.goal_focus,
        mesocycleId: activeProgram.mesocycle.id,
        mesocycleSessionId: createdSession.id,
        mesocycleWeek: activeProgram.current_week,
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

  const getFocusDisplayInfo = (focus: SessionFocus) => {
    // Map focuses to semantic theme variables where possible, or use standard palette overrides if needed.
    // Ideally, these should feel distinct but harmonious with the theme.
    // Using opacity variations or specific semantic roles can help.
    const focusMap = {
      strength: {
        title: 'Strength',
        color: 'bg-primary', // Use primary for main strength
        icon: <Dumbbell className="h-4 w-4" />
      },
      hypertrophy: {
        title: 'Hypertrophy',
        color: 'bg-secondary', // Secondary for hypertrophy
        icon: <Flame className="h-4 w-4" />
      },
      zone2: {
        title: 'Endurance',
        color: 'bg-accent', // Accent for endurance
        icon: <Heart className="h-4 w-4" />
      },
      zone5: {
        title: 'Max HR',
        color: 'bg-destructive', // Destructive/High intensity for Max HR
        icon: <Zap className="h-4 w-4" />
      },
      speed: {
        title: 'Speed & Power',
        color: 'bg-primary/80',
        icon: <Zap className="h-4 w-4" />
      },
      recovery: {
        title: 'Recovery',
        color: 'bg-muted-foreground',
        icon: <Heart className="h-4 w-4" />
      },
      mixed: {
        title: 'Mixed',
        color: 'bg-card-foreground',
        icon: <Dumbbell className="h-4 w-4" />
      },
    };
    return focusMap[focus] || { title: focus, color: 'bg-muted', icon: <Dumbbell className="h-4 w-4" /> };
  };

  if (!currentWorkout) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center h-full">
        <div className="w-full max-w-2xl space-y-4">
          {isLoadingMesocycle ? (
            <div className="py-5 px-6 bg-card border border-border rounded-lg shadow-sm">
              <p className="text-sm text-muted-foreground">Loading mesocycle...</p>
            </div>
          ) : activeProgram ? (
            <div className="py-6 px-6 bg-card border border-border rounded-lg shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-card-foreground">{activeProgram.mesocycle.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Week {activeProgram.current_week} of {activeProgram.mesocycle.duration_weeks}
                    {' '}| {activeProgram.mesocycle.protocol === 'occams' ? "Occam's Protocol" : 'Custom Protocol'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Focus: {formatSessionFocusLabel(activeProgram.mesocycle.goal_focus)}
                  </p>
                </div>
              </div>

              {activeProgram.mesocycle.protocol === 'occams' && activeProgram.sessions.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Next scheduled: <span className="text-foreground font-medium">{activeProgram.next_session_name ?? 'Occam A'}</span>
                    {' '}| Structure: 1 hard set to failure, 5s up / 5s down, 2-4+ rest days.
                  </p>
                  {activeProgram.last_completed_session_id && (
                    <p className="text-xs text-muted-foreground">
                      Last completed:{' '}
                      {activeProgram.sessions.find(session => session.id === activeProgram.last_completed_session_id)?.name ?? 'Unknown'}
                    </p>
                  )}

                  <Button onClick={handleStartNextProtocolSession} className="w-full">
                    Start Next ({activeProgram.next_session_name ?? 'Occam A'})
                  </Button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeProgram.sessions.map(sessionTemplate => (
                      <Button
                        key={sessionTemplate.id}
                        onClick={() => handleStartProtocolSession(sessionTemplate)}
                        variant="outline"
                        className="justify-start"
                      >
                        Start {sessionTemplate.name}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleStartCustomMesocycleSession}
                  disabled={isCreatingCustomSession}
                  className="w-full"
                >
                  {isCreatingCustomSession ? 'Starting...' : 'Start Custom Session'}
                </Button>
              )}
            </div>
          ) : (
            <div className="py-6 px-6 bg-card border border-border rounded-lg shadow-sm space-y-4">
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

          <div className="flex flex-col items-center justify-center py-8 px-6 bg-card border border-border rounded-lg shadow-sm w-full">
          <Barbell size={64} className="text-primary mb-6" />
          <h2 className="text-2xl font-semibold mb-4 text-card-foreground text-center">Ready to start your session?</h2>
          <p className="text-muted-foreground mb-8 text-center">
            Track your exercises, sets, and reps to monitor your progress over time.
          </p>

          <div className="w-full mb-6 relative z-0">
            <SessionFocusSelector
              onSelectFocus={handleFocusSelect}
              selectedFocus={selectedFocus}
              compact={true}
            />
          </div>

          <Button
            onClick={handleStartWorkout}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 w-full max-w-sm"
          >
            Start Session
          </Button>
        </div>
        </div>
      </div>
    );
  }

  const focusInfo = sessionFocus ? getFocusDisplayInfo(sessionFocus) : null;

  return (
    <div className="max-w-screen-md mx-auto p-4 flex flex-col h-full">
      <div className="bg-card border border-border p-4 rounded-lg mb-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center">
          <Clock className="text-primary mr-2" />
          <span className="text-xl font-mono text-card-foreground">
            {formatTime(currentWorkout.completed ? currentWorkout.duration : displayTime)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {focusInfo && (
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-full", focusInfo.color.replace('bg-', 'text-'))}>
                {focusInfo.icon}
              </div>
              <Badge
                variant="outline"
                className="text-xs"
              >
                {focusInfo.title}
              </Badge>
            </div>
          )}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto">
        <WorkoutComponent />
      </div>
    </div>
  );
};

export default Workout;
