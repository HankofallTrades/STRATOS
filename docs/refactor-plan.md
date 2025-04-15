---
description: 
globs: 
alwaysApply: false
---
The Lift Smart Workout App codebase is functional but has several areas where modularity, performance, and maintainability can be improved to align with high-performance consumer application standards. Below is a detailed plan to refactor and clean up the codebase, prioritizing state determinism, developer ergonomics, progressive enhancement, and adherence to SOLID principles. The plan focuses on architectural invariants, type safety, and scalable patterns while addressing specific pain points in the current structure.

---

## Refactoring Plan for Lift Smart Workout App

### 1. Project Structure and Organization [✅ Completed]
**Problem**: The directory structure is mostly sensible but could benefit from stricter separation of concerns and better grouping of related modules. The `components/ui` folder is bloated with too many files, and business logic is scattered across context, components, and pages.

**Plan**:
- **Restructure Directories**:
  - Split `components/` into:
    - `components/core/` for reusable UI primitives (e.g., `Button`, `Card` from `components/ui/`).
    - `components/features/` for feature-specific components (e.g., `WorkoutComponent`, `ExerciseSelector`).
    - `components/layout/` for navigational and structural components (e.g., `BottomNav`).
  - Move `context/` to `state/` and introduce subdirectories for specific domains (e.g., `state/workout/`, `state/auth/` if needed later).
  - Consolidate `types/` and `integrations/` into a `lib/` directory for shared utilities, types, and integrations.
  - Example updated structure:
    ```
    src/
    ├── components/
    │   ├── core/              # Button, Card, etc.
    │   ├── features/          # WorkoutComponent, ExerciseSelector, etc.
    │   ├── layout/            # BottomNav, etc.
    ├── state/
    │   ├── workout/           # WorkoutContext.tsx, workoutSlice.ts
    ├── lib/
    │   ├── types/             # workout.ts, etc.
    │   ├── integrations/      # supabase/client.ts, types.ts
    │   ├── utils/             # timeUtils.ts, cn.ts
    ├── pages/                 # Index.tsx, Analytics.tsx, etc.
    ├── hooks/                 # use-mobile.tsx, use-toast.ts
    ├── App.tsx
    ├── main.tsx
    ├── index.css
    ├── vite-env.d.ts
    ```
- **Extract Domain Logic**:
  - Move workout-related logic (e.g., `calculateOneRepMax`, `getWeightSuggestions`) from `WorkoutContext.tsx` to a dedicated `lib/workout/` module (e.g., `lib/workout/workoutUtils.ts`).
  - Create a `lib/workout/models.ts` for pure data transformations and business rules (e.g., exercise validation, set calculations).
- **Centralize Constants**:
  - Move hardcoded values (e.g., `MOBILE_BREAKPOINT` in `use-mobile.tsx`, storage keys in `WorkoutContext.tsx`) to `lib/constants.ts`.
  - Group enums (e.g., equipment types: `'DB' | 'BB' | 'KB' | 'Cable' | 'Free'`) into `lib/types/enums.ts`.

**Deliverables**:
- Updated directory structure with clear separation of concerns.
- Consolidated utilities and constants for better maintainability.
- Reduced `components/ui/` file count by grouping related primitives (e.g., `dialog.tsx`, `alert-dialog.tsx` into a `Dialog/` subdirectory).

---

### 2. State Management [✅ Completed]
**Problem**: `WorkoutContext.tsx` is a monolithic context handling too many responsibilities (exercise management, workout state, history, timers, local storage). It's prone to bugs due to tight coupling and lacks scalability for future features like user authentication or cloud sync.

**Plan**:
- **Adopt Redux Toolkit (RTK)**:
  - Replace `WorkoutContext` with RTK for predictable state management and better debugging.
  - Create slices for distinct domains:
    - `workoutSlice`: Manages `currentWorkout`, `workoutTime`, and active workout operations.
    - `exerciseSlice`: Handles `exercises`, `lastUsedEquipment`, and `exerciseVariations`.
    - `historySlice`: Manages `workoutHistory`.
  - Example `workoutSlice`:
    ```ts
    import { createSlice, PayloadAction } from '@reduxjs/toolkit';
    import { Workout, ExerciseSet } from '@/lib/types/workout';

    interface WorkoutState {
      currentWorkout: Workout | null;
      workoutTime: number;
    }

    const initialState: WorkoutState = {
      currentWorkout: null,
      workoutTime: 0,
    };

    const workoutSlice = createSlice({
      name: 'workout',
      initialState,
      reducers: {
        startWorkout(state) {
          state.currentWorkout = { id: uuidv4(), date: new Date(), duration: 0, exercises: [], completed: false };
          state.workoutTime = 0;
        },
        addSetToExercise(state, action: PayloadAction<{ workoutExerciseId: string }>) {
          if (!state.currentWorkout) return;
          const workoutExercise = state.currentWorkout.exercises.find(
            (ex) => ex.id === action.payload.workoutExerciseId
          );
          if (!workoutExercise) return;
          const newSet: ExerciseSet = {
            id: uuidv4(),
            weight: workoutExercise.sets.at(-1)?.weight ?? 0,
            reps: 0,
            exerciseId: workoutExercise.exerciseId,
            completed: false,
          };
          workoutExercise.sets.push(newSet);
        },
        // ... other reducers
      },
    });

    export const { startWorkout, addSetToExercise } = workoutSlice.actions;
    export default workoutSlice.reducer;
    ```
- **Persist State**:
  - Use `redux-persist` to handle local storage for `exercises`, `workoutHistory`, `lastUsedEquipment`, and `exerciseVariations`.
  - Configure selective persistence to avoid storing transient state (e.g., `workoutTime`).
  - Example:
    ```ts
    import { persistReducer } from 'redux-persist';
    import storage from 'redux-persist/lib/storage';

    const persistConfig = {
      key: 'exercise',
      storage,
      whitelist: ['exercises', 'lastUsedEquipment', 'exerciseVariations'],
    };

    const persistedExerciseReducer = persistReducer(persistConfig, exerciseSlice.reducer);
    ```
- **Extract Timer Logic**:
  - Move timer logic to a custom hook (`useWorkoutTimer`) to decouple it from state management.
  - Example:
    ```ts
    import { useEffect, useState } from 'react';
    import { useAppDispatch, useAppSelector } from '@/hooks/redux';

    export const useWorkoutTimer = () => {
      const dispatch = useAppDispatch();
      const currentWorkout = useAppSelector((state) => state.workout.currentWorkout);
      const [workoutTime, setWorkoutTime] = useState(0);

      useEffect(() => {
        if (!currentWorkout || currentWorkout.completed) return;
        const interval = setInterval(() => setWorkoutTime((prev) => prev + 1), 1000);
        return () => clearInterval(interval);
      }, [currentWorkout]);

      return workoutTime;
    };
    ```
- **Type Safety**:
  - Use TypeScript interfaces for all state shapes in slices.
  - Enforce discriminated unions for actions (already implicit in RTK).
  - Update `lib/types/workout.ts` to include Redux-specific types (e.g., `RootState`, `AppDispatch`).

**Deliverables**:
- RTK-based state management with clear slice boundaries.
- Persisted state for exercises and history.
- Decoupled timer logic in a reusable hook.
- Fully typed state and actions.

---

### 3. Server State Management (Supabase & TanStack Query) [✅ Completed]
**Problem**: Fetching and managing data from an external source like Supabase directly within Redux or component state can lead to boilerplate for handling loading, error, caching, and synchronization states. Mixing server cache state with global client state in Redux can increase complexity.

**Plan**:
- **Adopt TanStack Query (React Query)**:
  - Introduce TanStack Query for managing asynchronous server state (data from Supabase).
  - Use `useQuery` hook to fetch data like the list of exercises (`exercises`). TanStack Query will handle caching, background updates, and refetching automatically.
  - Use `useMutation` hook for creating, updating, or deleting data in Supabase (e.g., adding a new exercise type). Mutations will handle server-side updates and provide mechanisms to invalidate relevant queries (`useQuery`) to refetch stale data.
  - Example `useQuery` for exercises:
    ```ts
    // Assuming fetchExercisesFromDB() interacts with Supabase client
    import { useQuery } from '@tanstack/react-query';
    import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises'; // Hypothetical path

    function ExerciseSelector() {
      const { data: exercises, isLoading, error } = useQuery({
        queryKey: ['exercises'],
        queryFn: fetchExercisesFromDB,
      });
      // ... use exercises, isLoading, error in component
    }
    ```
  - Example `useMutation` for adding an exercise:
    ```ts
    import { useMutation, useQueryClient } from '@tanstack/react-query';
    import { createExerciseInDB } from '@/lib/integrations/supabase/exercises'; // Hypothetical path

    function ExerciseCreator() {
      const queryClient = useQueryClient();
      const mutation = useMutation({
        mutationFn: createExerciseInDB,
        onSuccess: () => {
          // Invalidate and refetch the exercises list
          queryClient.invalidateQueries({ queryKey: ['exercises'] });
        },
      });

      const handleAddNew = (exerciseName: string) => {
        mutation.mutate({ name: exerciseName /* other fields */ });
      };
      // ... UI for adding exercise
    }
    ```
- **Separation from Redux**:
  - Keep Redux focused on managing global *client* state (e.g., `currentWorkout`, UI state like theme or modals).
  - Data fetched by TanStack Query can be passed to Redux actions if needed (e.g., adding a selected exercise *instance* to the `currentWorkout` slice), but the source data and its fetching/caching lifecycle are managed by TanStack Query.
- **Setup**:
  - Install `@tanstack/react-query`.
  - Wrap the application root with `QueryClientProvider`.
  - Define query keys and fetching functions for Supabase interactions.

**Deliverables**:
- TanStack Query integrated for managing Supabase server state.
- Components refactored to use `useQuery` for fetching data (e.g., `ExerciseSelector`).
- Components refactored to use `useMutation` for modifying Supabase data.
- Clear separation between server state (TanStack Query) and client state (Redux).

---

### 4. Component Modularity and UI Primitives
**Problem**: The `components/ui/` directory is a dumping ground for shadcn-ui components, many of which are unused or overly generic. Feature components like `WorkoutExerciseComponent` mix UI logic with state mutations, violating separation of concerns.

**Plan**:
- **Audit and Prune UI Components**:
  - Analyze usage of `components/ui/` files (e.g., `carousel.tsx`, `menubar.tsx`) and remove unused ones to reduce bundle size.
  - Group related components (e.g., `dialog.tsx`, `alert-dialog.tsx`, `drawer.tsx`) into a `Dialog/` module with a unified export:
    ```ts
    // components/core/Dialog/index.ts
    export * from './Dialog';
    export * from './AlertDialog';
    export * from './Drawer';
    ```
  - Optimize `class-variance-authority` (cva) usage in components like `Button` and `Badge` to reduce runtime overhead by precomputing variants where possible.
- **Refactor Feature Components**:
  - Split `WorkoutExerciseComponent.tsx` into:
    - `WorkoutExerciseView`: Pure UI component for rendering exercise details and sets.
    - `WorkoutExerciseContainer`: Handles state interactions (e.g., `addSetToExercise`, `updateSet`).
    - Example:
      ```ts
      // components/features/WorkoutExerciseView.tsx
      import { Exercise, ExerciseSet } from '@/lib/types/workout';
      import { Button } from '@/components/core/Button';
      import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/core/Select';

      interface WorkoutExerciseViewProps {
        workoutExercise: { id: string; exercise: Exercise; sets: ExerciseSet[] };
        variations: string[];
        lastPerformance: { weight: number; reps: number } | null;
        onAddSet: () => void;
        onEquipmentChange: (value: string) => void;
        onVariationChange: (value: string) => void;
        onSetUpdate: (set: ExerciseSet) => void;
        onSetDelete: (setId: string) => void;
      }

      export const WorkoutExerciseView = ({
        workoutExercise,
        variations,
        lastPerformance,
        onAddSet,
        onEquipmentChange,
        onVariationChange,
        onSetUpdate,
        onSetDelete,
      }: WorkoutExerciseViewProps) => (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Select value={workoutExercise.exercise.equipmentType || ''} onValueChange={onEquipmentChange}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DB">DB</SelectItem>
                    <SelectItem value="BB">BB</SelectItem>
                    <SelectItem value="KB">KB</SelectItem>
                    <SelectItem value="Cable">Cable</SelectItem>
                    <SelectItem value="Free">Free</SelectItem>
                  </SelectContent>
                </Select>
                <span>{workoutExercise.exercise.name}</span>
                <Select value={workoutExercise.exercise.variations?.[0] || ''} onValueChange={onVariationChange}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Variation" />
                  </SelectTrigger>
                  <SelectContent>
                    {variations.map((variation) => (
                      <SelectItem key={variation} value={variation}>
                        {variation}
                      </SelectItem>
                    ))}
                    <SelectItem value="add_new">+ Add New</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {lastPerformance && (
                <span className="text-sm font-normal text-gray-500">
                  Last time: {lastPerformance.weight} kg × {lastPerformance.reps} reps
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workoutExercise.sets.map((set, index) => (
                <SetComponent
                  key={set.id}
                  workoutExerciseId={workoutExercise.id}
                  set={set}
                  setNumber={index + 1}
                  currentEquipmentType={workoutExercise.exercise.equipmentType}
                  currentVariation={workoutExercise.exercise.variations?.[0]}
                  onUpdate={onSetUpdate}
                  onDelete={() => onSetDelete(set.id)}
                />
              ))}
              <Button variant="outline" className="w-full border-dashed" onClick={onAddSet}>
                <Plus size={16} className="mr-2" />
                Add Set
              </Button>
            </div>
          </CardContent>
        </Card>
      );

      // components/features/WorkoutExerciseContainer.tsx
      import { useAppDispatch, useAppSelector } from '@/hooks/redux';
      import { WorkoutExerciseView } from './WorkoutExerciseView';
      import { addSetToExercise, updateExerciseEquipment, updateExerciseVariation, updateSet, deleteSet, completeSet, getLastPerformance, getExerciseVariations } from '@/state/workout/workoutSlice';

      interface WorkoutExerciseContainerProps {
        workoutExercise: { id: string; exercise: Exercise; sets: ExerciseSet[] };
      }

      export const WorkoutExerciseContainer = ({ workoutExercise }: WorkoutExerciseContainerProps) => {
        const dispatch = useAppDispatch();
        const lastPerformance = useAppSelector((state) => getLastPerformance(state, workoutExercise.exerciseId));
        const variations = useAppSelector((state) => getExerciseVariations(state, workoutExercise.exerciseId));

        const handleAddSet = () => dispatch(addSetToExercise({ workoutExerciseId: workoutExercise.id }));
        const handleEquipmentChange = (value: string) =>
          dispatch(updateExerciseEquipment({ workoutExerciseId: workoutExercise.id, equipmentType: value as 'DB' | 'BB' | 'KB' | 'Cable' | 'Free' }));
        const handleVariationChange = (value: string) =>
          dispatch(updateExerciseVariation({ workoutExerciseId: workoutExercise.id, variation: value }));
        const handleSetUpdate = (set: ExerciseSet) => {
          dispatch(updateSet({ workoutExerciseId: workoutExercise.id, setId: set.id, weight: set.weight, reps: set.reps }));
          dispatch(completeSet({ workoutExerciseId: workoutExercise.id, setId: set.id, completed: set.completed }));
        };
        const handleSetDelete = (setId: string) => dispatch(deleteSet({ workoutExerciseId: workoutExercise.id, setId }));

        return (
          <WorkoutExerciseView
            workoutExercise={workoutExercise}
            variations={variations}
            lastPerformance={lastPerformance}
            onAddSet={handleAddSet}
            onEquipmentChange={handleEquipmentChange}
            onVariationChange={handleVariationChange}
            onSetUpdate={handleSetUpdate}
            onSetDelete={handleSetDelete}
          />
        );
      };
      ```
  - Apply similar container/view splits to `WorkoutComponent`, `ExerciseSelector`, and `SetComponent`.
- **Enhance Accessibility**:
  - Add ARIA attributes to interactive components (e.g., `BottomNav`, `Select` in `WorkoutExerciseComponent`).
  - Ensure keyboard navigation for all UI elements (e.g., `Enter` key support for buttons).
  - Example for `BottomNav`:
    ```ts
    <NavLink
      to="/analytics"
      className={({ isActive }) => `flex flex-col items-center p-2 ${isActive ? 'text-blue-500' : 'text-gray-500'}`}
      aria-current={isActive ? 'page' : undefined}
      aria-label="Analytics"
    >
      <BarChart2 className="h-6 w-6" aria-hidden="true" />
      <span className="text-xs mt-1">Analytics</span>
    </NavLink>
    ```
- **Progressive Enhancement**:
  - Ensure UI components render meaningfully without JavaScript (e.g., fallback links in `BottomNav`).
  - Use `useIsMobile` hook to conditionally render mobile-friendly layouts (e.g., hide certain analytics charts on small screens).

**Deliverables**:
- Leaner `components/core/` directory with grouped primitives.
- Feature components split into view and container patterns.
- Improved accessibility with ARIA compliance and keyboard support.
- Progressive enhancement for non-JS scenarios.

---

### 5. Performance Optimization
**Problem**: The app has potential performance bottlenecks:
- Large initial bundle size due to shadcn-ui and unused dependencies.
- Inefficient state updates in `WorkoutContext` (e.g., deep cloning entire workout objects).
- Unoptimized local storage usage (serializing/deserializing large objects on every change).

**Plan**:
- **Bundle Size Reduction**:
  - Run `vite-bundle-visualizer` to identify large dependencies.
  - Remove unused shadcn-ui components and dependencies (e.g., `cmdk`, `vaul` if not used).
  - Replace `uuid` with a lighter alternative (e.g., `nanoid`) or a custom ID generator for workout/exercise IDs.
  - Example custom ID generator:
    ```ts
    // lib/utils/id.ts
    let counter = 0;
    export const generateId = () => `id_${Date.now()}_${counter++}`;
    ```
- **Optimize State Updates**:
  - Use Immer (included with RTK) for efficient state updates in slices.
  - Memoize selectors with `createSelector` from `reselect` to avoid recomputing derived state.
  - Example:
    ```ts
    import { createSelector } from 'reselect';
    import { RootState } from '@/state/store';

    const selectWorkoutState = (state: RootState) => state.workout;
    export const selectLastPerformance = createSelector(
      [selectWorkoutState, (_, exerciseId: string) => exerciseId],
      (workoutState, exerciseId) => {
        // Logic to compute last performance
        return workoutState.history
          .flatMap((workout) => workout.exercises)
          .filter((ex) => ex.exerciseId === exerciseId)
          .flatMap((ex) => ex.sets)
          .filter((set) => set.completed)
          .reduce<{ weight: number; reps: number } | null>(
            (max, set) => (!max || set.weight > max.weight ? { weight: set.weight, reps: set.reps } : max),
            null
          );
      }
    );
    ```
- **Local Storage Optimization**:
  - Debounce storage writes using a utility like `lodash.debounce`.
  - Example:
    ```ts
    import { debounce } from 'lodash';
    import { useEffect } from 'react';
    import { useAppSelector } from '@/hooks/redux';

    const persistExercises = debounce((exercises: Exercise[]) => {
      localStorage.setItem('liftSmart_exercises', JSON.stringify(exercises));
    }, 500);

    export const usePersistExercises = () => {
      const exercises = useAppSelector((state) => state.exercise.exercises);
      useEffect(() => {
        persistExercises(exercises);
      }, [exercises]);
    };
    ```
  - Store only deltas or use IndexedDB for larger datasets (e.g., workout history) with `idb-keyval`.
- **Lazy Loading**:
  - Lazy-load non-critical pages (`Analytics.tsx`, `Settings.tsx`) using React's `lazy` and `Suspense`.
  - Example:
    ```ts
    // App.tsx
    import { lazy, Suspense } from 'react';
    import { Routes, Route } from 'react-router-dom';

    const Analytics = lazy(() => import('./pages/Analytics'));
    const Settings = lazy(() => import('./pages/Settings'));

    const App = () => (
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    );
    ```
- **Optimize Renders**:
  - Use `React.memo` for pure components (e.g., `SetComponent`, `BottomNav`).
  - Avoid inline function props in render-heavy components (e.g., `WorkoutExerciseComponent's `onClick` handlers).
  - Example:
    ```ts
    const SetComponent = React.memo(({ set, onUpdate, onDelete }: SetComponentProps) => {
      const handleUpdate = useCallback(
        (updates: Partial<ExerciseSet>) => onUpdate({ ...set, ...updates }),
        [set, onUpdate]
      );
      return <div>{/* ... */}</div>;
    });
    ```

**Deliverables**:
- Reduced bundle size through dependency pruning and lighter utilities.
- Efficient state updates with Immer and memoized selectors.
- Debounced local storage writes and potential IndexedDB adoption.
- Lazy-loaded pages and memoized components for better render performance.

---

### 6. Type Safety and Error Handling
**Problem**: TypeScript usage is inconsistent:
- Loose types in `tsconfig.app.json` (e.g., `strict: false`, `noImplicitAny: false`).
- Missing error boundaries and robust error handling.
- Supabase integration is present but unused, leading to potential type mismatches if activated.

**Plan**:
- **Strict TypeScript**:
  - Update `tsconfig.app.json`:
    ```json
    {
      "compilerOptions": {
        "target": "ES2020",
        "lib": ["ES2020", "DOM", "DOM.Iterable"],
        "module": "ESNext",
        "skipLibCheck": true,
        "moduleResolution": "bundler",
        "allowImportingTsExtensions": true,
        "isolatedModules": true,
        "moduleDetection": "force",
        "noEmit": true,
        "jsx": "react-jsx",
        "strict": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noImplicitAny": true,
        "noFallthroughCasesInSwitch": true,
        "baseUrl": ".",
        "paths": {
          "@/*": ["./src/*"]
        }
      },
      "include": ["src"]
    }
    ```
  - Add explicit types for all functions and components (e.g., `WorkoutContextType` is good but needs stricter unions for optional fields).
  - Use discriminated unions for equipment types and variations:
    ```ts
    // lib/types/enums.ts
    export const EquipmentType = {
      Dumbbell: 'DB',
      Barbell: 'BB',
      Kettlebell: 'KB',
      Cable: 'Cable',
      Free: 'Free',
    } as const;
    export type EquipmentType = typeof EquipmentType[keyof typeof EquipmentType];
    ```
- **Error Boundaries**:
  - Add a global error boundary in `App.tsx`:
    ```ts
    import { Component, ReactNode } from 'react';

    class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
      state = { hasError: false };
      static getDerivedStateFromError() {
        return { hasError: true };
      }
      render() {
        if (this.state.hasError) {
          return <div>Something went wrong. Please refresh.</div>;
        }
        return this.props.children;
      }
    }

    const App = () => (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          {/* ... rest of App */}
        </QueryClientProvider>
      </ErrorBoundary>
    );
    ```
  - Add component-level error boundaries for critical components (e.g., `WorkoutComponent`).
- **Supabase Integration**:
  - Either activate Supabase for cloud storage of workouts/exercises or remove it to reduce bundle size.
  - If keeping, define typed queries and mutations:
    ```ts
    // lib/integrations/supabase/workout.ts
    import { supabase } from './client';
    import { Exercise, Workout } from '@/lib/types/workout';

    export const fetchExercises = async (): Promise<Exercise[]> =>
      (await supabase.from('exercises').select('*')).data ?? [];

    export const saveWorkout = async (workout: Workout): Promise<void> => {
      const { error } = await supabase.from('workouts').insert(workout);
      if (error) throw new Error(`Failed to save workout: ${error.message}`);
    };
    ```
  - Update `workoutSlice` to dispatch async thunks for Supabase operations.
- **Input Validation**:
  - Use Zod for runtime validation of user inputs (e.g., set weight/reps, new exercise names).
  - Example:
    ```ts
    // lib/workout/validators.ts
    import { z } from 'zod';

    export const setSchema = z.object({
      weight: z.number().min(0, 'Weight must be non-negative'),
      reps: z.number().min(0, 'Reps must be non-negative'),
      exerciseId: z.string().uuid('Invalid exercise ID'),
      completed: z.boolean(),
    });

    export const validateSet = (data: unknown) => setSchema.parse(data);
    ```

**Deliverables**:
- Strict TypeScript configuration across the board.
- Global and component-level error boundaries.
- Activated or removed Supabase integration with typed queries.
- Zod-based validation for critical inputs.

---

### 7. Testing and Quality Assurance
**Problem**: No tests are present, making refactoring risky. ESLint rules are too permissive (e.g., `no-unused-vars: off`), and there's no CI pipeline for linting/testing.

**Plan**:
- **Add Testing Setup**:
  - Install Vitest and Playwright:
    ```json
    // package.json
    "scripts": {
      "test": "vitest run",
      "test:watch": "vitest",
      "test:e2e": "playwright test"
    },
    "devDependencies": {
      "vitest": "^1.0.0",
      "@vitest/coverage-v8": "^1.0.0",
      "@playwright/test": "^1.40.0"
    }
    ```
  - Write unit tests for utilities (e.g., `timeUtils.ts`, `workoutUtils.ts`):
    ```ts
    // lib/utils/timeUtils.test.ts
    import { formatTime } from './timeUtils';
    import { describe, expect, it } from 'vitest';

    describe('formatTime', () => {
      it('formats seconds correctly', () => {
        expect(formatTime(65)).toBe('01:05');
        expect(formatTime(3665)).toBe('1:01:05');
      });
    });
    ```
  - Write integration tests for critical components (e.g., `WorkoutExerciseContainer`):
    ```ts
    // components/features/WorkoutExerciseContainer.test.tsx
    import { render, screen } from '@testing-library/react';
    import { describe, it, expect } from 'vitest';
    import { Provider } from 'react-redux';
    import { WorkoutExerciseContainer } from './WorkoutExerciseContainer';
    import { store } from '@/state/store';

    describe('WorkoutExerciseContainer', () => {
      it('renders exercise name', () => {
        const workoutExercise = {
          id: '1',
          exercise: { id: 'e1', name: 'Bench Press' },
          sets: [],
        };
        render(
          <Provider store={store}>
            <WorkoutExerciseContainer workoutExercise={workoutExercise} />
          </Provider>
        );
        expect(screen.getByText('Bench Press')).toBeInTheDocument();
      });
    });
    ```
  - Write E2E tests for core flows (e.g., starting a workout, adding a set):
    ```ts
    // tests/e2e/workout.spec.ts
    import { test, expect } from '@playwright/test';

    test('start workout and add set', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Start Workout' }).click();
      await expect(page.getByText('00:00')).toBeVisible();
      await page.getByRole('button', { name: 'Add Set' }).click();
      await expect(page.getByText('Set 1')).toBeVisible();
    });
    ```
- **Strengthen ESLint**:
  - Update `eslint.config.js`:
    ```js
    import js from '@eslint/js';
    import globals from 'globals';
    import reactHooks from 'eslint-plugin-react-hooks';
    import reactRefresh from 'eslint-plugin-react-refresh';
    import tseslint from 'typescript-eslint';

    export default tseslint.config(
      { ignores: ['dist'] },
      {
        extends: [js.configs.recommended, ...tseslint.configs.strict, ...tseslint.configs.stylistic],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
          ecmaVersion: 2020,
          globals: globals.browser,
        },
        plugins: {
          'react-hooks': reactHooks,
          'react-refresh': reactRefresh,
        },
        rules: {
          ...reactHooks.configs.recommended.rules,
          'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
          '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
          '@typescript-eslint/explicit-function-return-type': 'error',
        },
      }
    );
    ```
- **Set Up CI**:
  - Add GitHub Actions workflow for linting, type checking, and testing:
    ```yaml
    # .github/workflows/ci.yml
    name: CI
    on: [push, pull_request]
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: '20'
          - run: npm ci
          - run: npm run lint
          - run: npm run test
          - run: npm run test:e2e
    ```

**Deliverables**:
- Comprehensive test suite with unit, integration, and E2E tests.
- Strict ESLint rules for consistent code quality.
- CI pipeline for automated checks.

---

### 8. Supabase Integration and Data Persistence
**Problem**: The app uses local storage, which is fragile for large datasets and lacks cross-device sync. Supabase is included but unused.

**Plan**:
- **Activate Supabase**:
  - Define database schema in Supabase:
    ```sql
    create table exercises (
      id uuid primary key,
      name text not null,
      one_rep_max float,
      equipment_type text check (equipment_type in ('DB', 'BB', 'KB', 'Cable', 'Free')),
      variations text[]
    );

    create table workouts (
      id uuid primary key,
      date timestamptz not null,
      duration integer not null,
      completed boolean not null
    );

    create table workout_exercises (
      id uuid primary key,
      workout_id uuid references workouts(id),
      exercise_id uuid references exercises(id)
    );

    create table sets (
      id uuid primary key,
      workout_exercise_id uuid references workout_exercises(id),
      weight float not null,
      reps integer not null,
      completed boolean not null,
      equipment_type text,
      variation text
    );
    ```
  - Update `integrations/supabase/types.ts` with generated types from Supabase CLI.
- **Migrate Local Storage to Supabase**:
  - Create migration script to sync existing local storage data to Supabase:
    ```ts
    // lib/integrations/supabase/migrate.ts
    import { supabase } from './client';
    import { Exercise, Workout } from '@/lib/types/workout';

    export const migrateExercises = async (exercises: Exercise[]) => {
      const { error } = await supabase.from('exercises').insert(
        exercises.map((ex) => ({
          id: ex.id,
          name: ex.name,
          one_rep_max: ex.oneRepMax,
          equipment_type: ex.equipmentType,
          variations: ex.variations,
        }))
      );
      if (error) throw error;
    };

    export const migrateWorkouts = async (workouts: Workout[]) => {
      for (const workout of workouts) {
        const { error: workoutError } = await supabase.from('workouts').insert({
          id: workout.id,
          date: workout.date.toISOString(),
          duration: workout.duration,
          completed: workout.completed,
        });
        if (workoutError) throw workoutError;

        for (const ex of workout.exercises) {
          const { error: exError } = await supabase.from('workout_exercises').insert({
            id: ex.id,
            workout_id: workout.id,
            exercise_id: ex.exerciseId,
          });
          if (exError) throw exError;

          const { error: setError } = await supabase.from('sets').insert(
            ex.sets.map((set) => ({
              id: set.id,
              workout_exercise_id: ex.id,
              weight: set.weight,
              reps: set.reps,
              completed: set.completed,
              equipment_type: set.equipmentType,
              variation: set.variation,
            }))
          );
          if (setError) throw setError;
        }
      }
    };
    ```
  - Update `workoutSlice` and `exerciseSlice` to fetch from Supabase:
    ```ts
    import { createAsyncThunk } from '@reduxjs/toolkit';
    import { fetchExercises } from '@/lib/integrations/supabase/workout';

    export const loadExercises = createAsyncThunk('exercise/loadExercises', async () => {
      return await fetchExercises();
    });
    ```
- **Offline-First Strategy**:
  - Use `dexie.js` for local caching of Supabase data to enable offline mode.
  - Sync local changes with Supabase when online using a queue-based system:
    ```ts
    // lib/integrations/sync.ts
    import Dexie from 'dexie';
    import { supabase } from './supabase/client';

    const db = new Dexie('LiftSmart');
    db.version(1).stores({
      syncQueue: '++id,table,operation,data',
    });

    export const queueOperation = async (table: string, operation: 'insert' | 'update' | 'delete', data: any) => {
      await db.table('syncQueue').add({ table, operation, data });
    };

    export const syncWithSupabase = async () => {
      const operations = await db.table('syncQueue').toArray();
      for (const op of operations) {
        if (op.operation === 'insert') {
          await supabase.from(op.table).insert(op.data);
        }
        // Handle update/delete similarly
        await db.table('syncQueue').delete(op.id);
      }
    };
    ```

**Deliverables**:
- Fully integrated Supabase backend with defined schema.
- Migration script for local storage data.
- Offline-first capability with local caching and sync queue.

---

### 9. Styling and Theming
**Problem**: Tailwind CSS is heavily used, but there are inconsistencies (e.g., inline styles in `App.css`, redundant dark mode overrides in `index.css`). Theming lacks scalability for future customization.

**Plan**:
- **Consolidate Styles**:
  - Remove `App.css` and move relevant styles to `index.css` or component-specific Tailwind classes.
  - Eliminate redundant dark mode overrides in `index.css` (e.g., multiple `.bg-gray-*` rules).
  - Example consolidated `index.css`:
    ```css
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    @layer base {
      :root {
        --background: 0 0% 100%;
        --foreground: 222.2 84% 4.9%;
        /* ... other vars */
      }

      .dark {
        --background: 222.2 84% 4.9%;
        --foreground: 210 40% 98%;
        /* ... other vars */
        .bg-gray-50, .bg-gray-100, .bg-white {
          @apply bg-gray-800;
        }
        .text-gray-500, .text-gray-600 {
          @apply text-gray-400;
        }
        .border-gray-200 {
          @apply border-gray-700;
        }
        .hover\:bg-gray-50:hover {
          @apply hover:bg-gray-700;
        }
      }
    }

    @layer base {
      * {
        @apply border-border;
      }
      body {
        @apply bg-background text-foreground;
      }
    }
    ```
- **Scalable Theming**:
  - Extend `next-themes` with a custom theme provider to support multiple themes (e.g., light, dark, high-contrast).
  - Example:
    ```ts
    // lib/theme/ThemeProvider.tsx
    import { ThemeProvider as NextThemeProvider, useTheme } from 'next-themes';
    import { createContext, useContext } from 'react';

    interface ThemeContextType {
      theme: string;
      setTheme: (theme: 'light' | 'dark' | 'high-contrast') => void;
    }

    const ThemeContext = createContext<ThemeContextType | null>(null);

    export const ThemeProvider = ({ children }: { children: React.ReactNode }) => (
      <NextThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <ThemeContext.Provider value={useTheme()}>
          {children}
        </ThemeContext.Provider>
      </NextThemeProvider>
    );

    export const useCustomTheme = () => {
      const context = useContext(ThemeContext);
      if (!context) throw new Error('useCustomTheme must be used within ThemeProvider');
      return context;
    };
    ```
  - Update `tailwind.config.ts` to support theme-specific colors:
    ```ts
    export default {
      darkMode: ['class'],
      content: ['./src/**/*.{ts,tsx}'],
      theme: {
        extend: {
          colors: {
            fitnessBlue: {
              light: '#3B82F6',
              dark: '#60A5FA',
              'high-contrast': '#1E40AF',
            },
            fitnessGreen: {
              light: '#10B981',
              dark: '#34D399',
              'high-contrast': '#065F46',
            },
          },
        },
      },
      plugins: [require('tailwindcss-animate')],
    } satisfies Config;
    ```
- **Atomic Design**:
  - Refactor components to follow atomic design principles (atoms, molecules, organisms).
  - Example: `Button` (atom), `Select` (molecule), `WorkoutExerciseView` (organism).

**Deliverables**:
- Consolidated and optimized Tailwind CSS.
- Scalable theming system with multiple theme support.
- Component hierarchy aligned with atomic design.

---

### 10. Documentation and Developer Experience
**Problem**: The `README.md` is generic and lacks setup instructions for testing, linting, or Supabase integration. There's no inline documentation for complex logic.

**Plan**:
- **Update README**:
  - Add detailed setup, testing, and deployment instructions.
  - Example:
    ```markdown
    # Lift Smart Workout App

    A workout tracking app built with React, TypeScript, Tailwind CSS, and Supabase.

    ## Setup

    1. Clone the repo: `git clone <repo-url>`
    2. Install dependencies: `npm install`
    3. Set up environment variables:
       ```bash
       cp .env.example .env
       # Add Supabase credentials
       ```
    4. Run the dev server: `npm run dev`

    ## Scripts

    - `npm run dev`: Start development server
    - `npm run build`: Build for production
    - `npm run test`: Run unit tests
    - `npm run test:e2e`: Run E2E tests
    - `npm run lint`: Run ESLint

    ## Testing

    - Unit tests: Vitest (`npm run test`)
    - E2E tests: Playwright (`npm run test:e2e`)

    ## Supabase Integration

    1. Set up a Supabase project.
    2. Update `src/lib/integrations/supabase/client.ts` with your credentials.
    3. Run migrations: `npm run migrate`

    ## Deployment

    Deploy using Vercel:
    1. Connect repo to Vercel.
    2. Set environment variables in Vercel dashboard.
    3. Deploy.
    ```
- **Add JSDoc**:
  - Document complex functions in `lib/workout/workoutUtils.ts` and slices:
    ```ts
    /**
     * Calculates one-rep max using the Brzycki formula.
     * @param weight - The weight lifted in kilograms.
     * @param reps - The number of repetitions performed.
     * @returns The estimated one-rep max in kilograms.
     */
    export const calculateOneRepMax = (weight: number, reps: number): number => {
      if (reps === 1) return weight;
      return weight * (36 / (37 - reps));
    };
    ```
- **Storybook for Components**:
  - Set up Storybook to document and test UI components in isolation:
    ```bash
    npx storybook init
    ```
  - Create stories for core components:
    ```ts
    // components/core/Button.stories.tsx
    import { Button } from './Button';
    import { Meta, StoryObj } from '@storybook/react';

    const meta: Meta<typeof Button> = {
      title: 'Core/Button',
      component: Button,
      argTypes: {
        variant: { control: 'select', options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] },
        size: { control: 'select', options: ['default', 'sm', 'lg', 'icon'] },
      },
    };

    export default meta;
    type Story = StoryObj<typeof Button>;

    export const Default: Story = {
      args: {
        children: 'Click me',
        variant: 'default',
        size: 'default',
      },
    };
    ```

**Deliverables**:
- Comprehensive `README.md` with setup and testing instructions.
- JSDoc for critical functions and modules.
- Storybook setup for UI component documentation.

---

### 11. Deployment and DevOps
**Problem**: No clear deployment pipeline or environment configuration. The `vite.config.ts` lacks optimization for production builds.

**Plan**:
- **Optimize Vite Config**:
  - Add production optimizations:
    ```ts
    import { defineConfig } from 'vite';
    import react from '@vitejs/plugin-react-swc';
    import path from 'path';
    import { visualizer } from 'rollup-plugin-visualizer';

    export default defineConfig(({ mode }) => ({
      server: {
        host: '::',
        port: 8080,
      },
      plugins: [
        react(),
        mode === 'production' && visualizer({ open: true }),
      ].filter(Boolean),
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        },
      },
      build: {
        sourcemap: mode === 'production',
        minify: 'esbuild',
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom', 'react-router-dom'],
              ui: ['@radix-ui/react-slot', '@radix-ui/react-select'],
            },
          },
        },
      },
    }));
    ```
- **Environment Variables**:
  - Add `.env.example` for Supabase credentials and other configs:
    ```env
    VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
    VITE_SUPABASE_KEY=your-supabase-key
    ```
  - Use `zod` to validate environment variables:
    ```ts
    // lib/env.ts
    import { z } from 'zod';

    const envSchema = z.object({
      VITE_SUPABASE_URL: z.string().url(),
      VITE_SUPABASE_KEY: z.string(),
    });

    export const env = envSchema.parse(import.meta.env);
    ```
- **Vercel Deployment**:
  - Add `vercel.json` for optimized deployment:
    ```json
    {
      "version": 2,
      "builds": [
        {
          "src": "package.json",
          "use": "@vercel/node"
        }
      ],
      "routes": [
        {
          "src": "/(.*)",
          "dest": "/"
        }
      ]
    }
    ```
  - Configure Vercel environment variables via dashboard.
- **CI/CD Enhancements**:
  - Extend GitHub Actions to include deployment:
    ```yaml
    # .github/workflows/deploy.yml
    name: Deploy
    on:
      push:
        branches: [main]
    jobs:
      deploy:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: '20'
          - run: npm ci
          - run: npm run build
          - name: Deploy to Vercel
            uses: amondnet/vercel-action@v25
            with:
              vercel-token: ${{ secrets.VERCEL_TOKEN }}
              vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
              vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
    ```

**Deliverables**:
- Optimized Vite configuration for production.
- Environment variable validation.
- Vercel deployment setup with CI/CD pipeline.

---

### Implementation Timeline
| Phase                  | Tasks                                                                 | Duration |
|------------------------|----------------------------------------------------------------------|----------|
| **Week 1: Planning**   | Audit codebase, finalize directory structure, set up RTK and testing | 2 days   |
| **Week 2: Structure**  | Restructure directories, extract utilities, consolidate constants     | 3 days   |
| **Week 3: State**      | Implement RTK slices, persist state, extract timer hook               | 3 days   |
| **Week 4: Server State** | Integrate TanStack Query, refactor data fetching/mutations            | 3 days   |
| **Week 5: Components** | Refactor UI components, split views/containers, enhance accessibility | 4 days   |
| **Week 6: Performance**| Optimize bundle, state updates, local storage, lazy-load pages       | 3 days   |
| **Week 7: Types**      | Enforce strict TS, add error boundaries, integrate Supabase           | 3 days   |
| **Week 8: Testing**    | Write unit, integration, E2E tests, strengthen ESLint, set up CI     | 4 days   |
| **Week 9: Supabase**   | Define schema, migrate data, implement offline-first sync             | 3 days   |
| **Week 10: Styling**    | Consolidate CSS, enhance theming, apply atomic design                 | 3 days   |
| **Week 11: Docs/DevOps**| Update README, add JSDoc, set up Storybook, optimize deployment      | 3 days   |

**Total Duration**: ~11 weeks (assuming 1 developer, 40 hours/week)

---

### Success Metrics
- **Code Quality**: 90%+ test coverage, zero ESLint errors, strict TypeScript compliance.
- **Performance**: Bundle size < 500KB (minified + gzipped), < 100ms state update latency.
- **Maintainability**: Clear separation of concerns, modular components, comprehensive docs.
- **User Experience**: Offline support, ARIA-compliant UI, consistent theming across devices.
- **Deployment**: Automated CI/CD with zero-downtime Vercel deployments.

---

### Risks and Mitigations
- **Risk**: Breaking changes during state management refactor.
  - **Mitigation**: Write comprehensive tests before refactoring, use type assertions during transition.
- **Risk**: Supabase migration fails for existing users.
  - **Mitigation**: Implement robust migration script, provide fallback to local storage.
- **Risk**: Performance optimizations increase complexity.
  - **Mitigation**: Document trade-offs, prioritize developer ergonomics with clear APIs.
- **Risk**: Timeline slippage due to testing overhead.
  - **Mitigation**: Start with critical tests, incrementally add coverage.

---

This plan transforms the Lift Smart Workout App into a scalable, performant, and maintainable application while preserving its core functionality. It aligns with your architectural preferences for modularity, type safety, and deterministic state management, ensuring a robust foundation for future features like user accounts or workout plans. Let me know if you want to dive deeper into any section or start implementing specific parts!