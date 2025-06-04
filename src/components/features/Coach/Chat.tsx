// src/components/features/Coach/Chat.tsx
import React, { useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';
import { Send } from 'lucide-react';
import type { ChatMessage } from '@/lib/llm/llmClient';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChatPrimers from './ChatPrimers';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, startOfDay } from 'date-fns';
import { startWorkout, addExerciseToWorkout } from '@/state/workout/workoutSlice';
import { selectWorkoutHistory } from '@/state/history/historySlice';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises';
import type { Exercise, ExerciseSet, WorkoutExercise, Workout } from '@/lib/types/workout';

interface ChatProps {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: (textOrEvent?: string | React.FormEvent<HTMLFormElement>) => void;
  className?: string;
}

// Archetype targets (using DB archetype names)
const ARCHETYPE_TARGETS: Record<string, number> = {
  'squat': 7,
  'lunge': 7,
  'push_vertical': 5,
  'push_horizontal': 5,
  'pull_vertical': 5,
  'pull_horizontal': 5,
  'bend': 7,
  'twist': 7,
};

const getArchetypeName = (exercise: Exercise, archetypeMap: Map<string, string>): string | undefined => {
  if (!exercise.archetype_id) return undefined;
  return archetypeMap.get(exercise.archetype_id)?.toLowerCase();
};

const calculateWeeklySetsPerArchetype = (
  workoutHistory: Workout[],
  exerciseMap: Map<string, Exercise>,
  archetypeMap: Map<string, string>
): Record<string, number> => {
  const weeklySets: Record<string, number> = {};
  const today = startOfDay(new Date());
  workoutHistory.forEach(workout => {
    const workoutDate = startOfDay(new Date(workout.date));
    if (differenceInDays(today, workoutDate) < 7) {
      workout.exercises.forEach(workoutExercise => {
        const completedSets = workoutExercise.sets.filter(set => set.completed);
        if (completedSets.length > 0) {
          const exerciseDetails = exerciseMap.get(workoutExercise.exerciseId);
          if (!exerciseDetails) return;
          const archetype = getArchetypeName(exerciseDetails, archetypeMap);
          if (!archetype) return;
          if (!weeklySets[archetype]) weeklySets[archetype] = 0;
          weeklySets[archetype] += completedSets.length;
        }
      });
    }
  });
  return weeklySets;
};

const selectExercisesForWorkout = (
  availableExercises: Exercise[],
  weeklySets: Record<string, number>,
  archetypeMap: Map<string, string>,
  numExercisesToSelect = 4,
  excludeExerciseIds: string[] = []
): Exercise[] => {
  const archetypeDeficits: { name: string; deficit: number }[] = [];
  Object.entries(ARCHETYPE_TARGETS).forEach(([archetype, target]) => {
    const sets = weeklySets[archetype] || 0;
    if (sets < target) {
      archetypeDeficits.push({ name: archetype, deficit: target - sets });
    }
  });
  archetypeDeficits.sort((a, b) => b.deficit - a.deficit);

  const selectedExercises: Exercise[] = [];
  const selectedExerciseIds = new Set<string>();
  const coveredArchetypes = new Set<string>();

  for (const target of archetypeDeficits) {
    if (selectedExercises.length >= numExercisesToSelect) break;
    if (coveredArchetypes.has(target.name)) continue;
    const potentialExercises = availableExercises.filter(ex => {
      if (selectedExerciseIds.has(ex.id) || excludeExerciseIds.includes(ex.id)) return false;
      const archetype = getArchetypeName(ex, archetypeMap);
      return archetype === target.name;
    });
    if (potentialExercises.length > 0) {
      const bestExercise = potentialExercises[0];
      selectedExercises.push(bestExercise);
      selectedExerciseIds.add(bestExercise.id);
      coveredArchetypes.add(target.name);
    }
  }
  if (selectedExercises.length < numExercisesToSelect) {
    const fallbackExercises = availableExercises.filter(ex =>
      !selectedExerciseIds.has(ex.id) && !excludeExerciseIds.includes(ex.id)
    );
    const neededCount = numExercisesToSelect - selectedExercises.length;
    selectedExercises.push(...fallbackExercises.slice(0, neededCount));
  }
  return selectedExercises;
};

const Chat: React.FC<ChatProps> = ({
  messages,
  input,
  isLoading,
  onInputChange,
  onSendMessage,
  className = ''
}) => {
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const workoutHistory = useAppSelector(selectWorkoutHistory);

  // Fetch exercises and archetypes
  const { data: baseExercises, isLoading: isLoadingExercises, error: errorExercises } = useQuery<Exercise[], Error>({
    queryKey: ['exercises'],
    queryFn: fetchExercisesFromDB,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const { data: movementArchetypes, isLoading: isLoadingMovementArchetypes, error: errorMovementArchetypes } = useQuery<{ id: string; name: string }[], Error>({
    queryKey: ['movementArchetypes'],
    queryFn: async () => {
      console.log("Chat: Attempting to fetch movement_archetypes...");
      try {
        const { data, error } = await import('@/lib/integrations/supabase/client').then(m => m.supabase.from('movement_archetypes').select('id, name'));
        if (error) {
          console.error("Chat: Error fetching movement_archetypes:", JSON.stringify(error));
          throw error;
        }
        console.log("Chat: Successfully fetched movement_archetypes:", data);
        return data || [];
      } catch (catchError: any) {
        console.error("Chat: Caught exception fetching movement_archetypes:", JSON.stringify(catchError));
        throw catchError;
      }
    },
    staleTime: Infinity,
    enabled: !!baseExercises,
  });

  // Debug logging for button state
  React.useEffect(() => {
    console.log("Chat button debug:", {
      isLoadingExercises,
      baseExercises: !!baseExercises,
      baseExercisesLength: baseExercises?.length,
      isLoadingMovementArchetypes,
      movementArchetypes: !!movementArchetypes,
      movementArchetypesLength: movementArchetypes?.length,
      errorExercises: !!errorExercises,
      errorMovementArchetypes: !!errorMovementArchetypes,
      buttonWillBeDisabled: isLoadingExercises || !baseExercises || !movementArchetypes
    });
  }, [isLoadingExercises, baseExercises, isLoadingMovementArchetypes, movementArchetypes, errorExercises, errorMovementArchetypes]);

  const archetypeMap = useMemo(() => {
    if (!movementArchetypes) return new Map();
    return new Map(movementArchetypes.map(a => [a.id, a.name]));
  }, [movementArchetypes]);

  const exercisesWithArchetypes = useMemo((): Exercise[] => {
    if (!baseExercises) return [];
    return baseExercises.filter(ex => ex.archetype_id && archetypeMap.has(ex.archetype_id));
  }, [baseExercises, archetypeMap]);

  const exerciseMap = useMemo((): Map<string, Exercise> => {
    return new Map(exercisesWithArchetypes.map(ex => [ex.id, ex]));
  }, [exercisesWithArchetypes]);

  // Handler for the primer button
  const handleGenerateWorkout = () => {
    let numExercisesToSelect = 5;
    let excludeExerciseIds: string[] = [];
    if (workoutHistory && workoutHistory.length > 0) {
      const latestWorkoutDate = workoutHistory.reduce((latest, workout) => {
        const current = startOfDay(new Date(workout.date));
        return current > latest ? current : latest;
      }, new Date(0));
      const latestWorkout = workoutHistory.find(workout =>
        startOfDay(new Date(workout.date)).getTime() === latestWorkoutDate.getTime()
      );
      if (latestWorkoutDate.getTime() > 0) {
        const today = startOfDay(new Date());
        const daysSinceLastWorkout = differenceInDays(today, latestWorkoutDate);
        if (daysSinceLastWorkout <= 1) {
          numExercisesToSelect = 3;
          if (latestWorkout) {
            excludeExerciseIds = latestWorkout.exercises.map(ex => ex.exerciseId);
          }
        } else if (daysSinceLastWorkout <= 3) {
          numExercisesToSelect = 4;
          if (latestWorkout) {
            excludeExerciseIds = latestWorkout.exercises.map(ex => ex.exerciseId);
          }
        } else {
          numExercisesToSelect = 5;
        }
      }
    }
    if (exercisesWithArchetypes.length === 0) {
      console.error("Exercise data with archetypes is not available.");
      return;
    }
    const weeklySets = calculateWeeklySetsPerArchetype(workoutHistory, exerciseMap, archetypeMap);
    const exercisesToCreate = selectExercisesForWorkout(
      exercisesWithArchetypes,
      weeklySets,
      archetypeMap,
      numExercisesToSelect,
      excludeExerciseIds
    );
    if (exercisesToCreate.length === 0) {
      console.error("Failed to select any exercises based on history. Generating default workout.");
      return;
    }
    dispatch(startWorkout());
    exercisesToCreate.forEach(exercise => {
      const defaultEquipment = exercise.default_equipment_type ?? undefined;
      const defaultVariation = 'Standard';
      const defaultSet: ExerciseSet = {
        id: uuidv4(),
        weight: 0,
        reps: 0,
        exerciseId: exercise.id,
        completed: false,
        equipmentType: defaultEquipment,
        variation: defaultVariation,
      };
      const workoutExercise: WorkoutExercise = {
        id: uuidv4(),
        exerciseId: exercise.id,
        exercise: { ...exercise },
        sets: [defaultSet],
        equipmentType: defaultEquipment,
        variation: defaultVariation,
      };
      dispatch(addExerciseToWorkout(workoutExercise));
    });
    navigate('/workout');
  };

  // Only show primers if there are no user messages yet
  const hasUserMessages = messages.some(msg => msg.role === 'user');

  // Helper to simulate user prompt and send
  const simulatePrompt = (prompt: string) => {
    onInputChange({ target: { value: prompt } } as React.ChangeEvent<HTMLInputElement>);
    onSendMessage(prompt);
  };

  useEffect(() => {
    const container = messageContainerRef.current;
    if (!container) return;

    // Filter out system messages to align with rendered messages
    const actualMessages = messages.filter(msg => msg.role !== 'system');
    if (actualMessages.length === 0) {
        container.scrollTop = 0; // No messages, scroll to top
        return;
    }

    const lastMessage = actualMessages[actualMessages.length - 1];

    // Get rendered message elements (excluding the 'Thinking...' indicator)
    const messageElements = Array.from(container.children).filter(
      el => !el.querySelector('span.italic') // Filter out the 'Thinking...' div
    );

    if (lastMessage.role === 'user' && messageElements.length > 0) {
      // If the last message was from the user, scroll it to the top
      const lastMessageElement = messageElements[messageElements.length - 1] as HTMLElement;
      if (lastMessageElement) {
          // Scroll the container so the top of the element aligns with the top of the container
          container.scrollTop = lastMessageElement.offsetTop;
      } else {
          // Fallback: scroll to bottom if element not found somehow
          container.scrollTop = container.scrollHeight;
      }
    } else {
      // If last message is from assistant or initial load, scroll to bottom
      container.scrollTop = container.scrollHeight;
    }
    // Depend on messages and isLoading (as it affects the DOM structure)
  }, [messages, isLoading]);

  return (
    <div className={`flex flex-col h-full ${className}`}> 
      <div 
        ref={messageContainerRef}
        className="flex-grow overflow-y-auto mb-4 p-4 space-y-4 min-h-0"
      >
        {[...messages]
          .filter(msg => msg.role !== 'system')
          .map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg shadow ${message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 dark:text-white prose prose-sm dark:prose-invert prose-p:m-0 prose-headings:my-1 prose-ul:my-1 prose-li:my-0'
                  }`}
              >
                {message.role === 'assistant' ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
            </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="px-4 py-2 rounded-lg shadow bg-gray-100 dark:bg-gray-700 dark:text-white prose prose-sm dark:prose-invert">
              <span className="italic">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        {!hasUserMessages && (
          <div className="mb-2">
            <ChatPrimers
              buttons={[{
                label: 'Generate Strength Workout',
                onClick: handleGenerateWorkout,
                disabled: isLoadingExercises || isLoadingMovementArchetypes || !baseExercises || !movementArchetypes,
              }, {
                label: 'How can I get max swol?',
                onClick: () => simulatePrompt('How can I get max swol?'),
              }, {
                label: 'What can I do for post-workout recovery?',
                onClick: () => simulatePrompt('What can I do for post-workout recovery?'),
              }]}
            />
          </div>
        )}
        <form onSubmit={onSendMessage} className="flex items-center space-x-2">
          <Input
            type="text"
            value={input}
            onChange={onInputChange}
            placeholder="Ask your coach anything..."
            className="flex-grow"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="icon" className="">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
