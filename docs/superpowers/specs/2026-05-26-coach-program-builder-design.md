# Coach Program Builder Design

## Goal

Build the first serious Coach program-creation milestone: Coach should recognize when a user needs a training program, walk them through a short intake, draft a structured mesocycle, and save it only after explicit review and confirmation.

## Decisions

- Program creation is the first buildout milestone.
- Coach should be context-aware about the user's current program state.
- Coach should proactively suggest program setup when the user has no active program or has completed the current program.
- Program creation is draft-and-confirm. Coach may generate a concrete plan, but it must not mutate mesocycles or workouts without user confirmation.
- The first version uses a guided intake inside Coach rather than a separate route.
- `guidance` owns the Coach interaction and tool orchestration.
- `periodization` remains the source of truth for mesocycles and session templates.
- `fitness` remains the source of truth for exercise catalog and workout execution.
- General programs map to the existing `mixed` `SessionFocus`.
- Program completion is derived in the first version from program progress, with `current_week >= duration_weeks` treated as ready for next-block planning.
- Unresolved exercise names block saving in the first version. Coach should ask the user to revise or choose known catalog exercises rather than silently creating new exercises.

## Assumptions

- "Completed program" is initially inferred from active program state reaching the final week.
- The first builder saves a new active custom mesocycle and its session templates. It does not edit arbitrary existing workouts.
- Medical contraindication handling is limited to collecting constraints and reflecting them in the draft; Coach must not present itself as medical advice.
- The first version can support the existing `SessionFocus` values and the current 4-12 week mesocycle duration constraint.

## Success Criteria

- When a user opens Coach without an active program, they see a clear option to start guided program setup.
- When a user is near or at the end of an active program, Coach suggests planning the next block instead of treating the user as context-free.
- The intake captures goal, schedule, equipment, constraints, training history, preferred session style, and block duration.
- Coach produces a structured draft that can be validated before saving.
- The user can review the draft before any database mutation.
- Confirming the draft creates or resets the active program through `periodization` APIs.
- Existing Coach chat and next-workout generation continue to work.

## User Flow

1. User opens `/coach`.
2. `useCoachScreen` loads Coach readiness plus program context.
3. If there is no active program, Coach shows a primer such as "Build my program".
4. If there is an active program in its final week, Coach shows a primer such as "Plan next block".
5. User starts the builder.
6. Coach launches a client-side guided intake tool inside the chat surface.
7. User answers a small set of structured questions:
   - primary goal
   - days per week
   - session length
   - available equipment
   - injuries or movement constraints
   - training age and recent consistency
   - preferred duration
   - exercises to include or avoid
8. Coach drafts a program from intake plus profile, recent workouts, active/latest program, exercise catalog, and current periodization rules.
9. The UI renders a review card with the mesocycle and sessions.
10. User confirms, edits intake, or cancels.
11. Confirming saves the program and refreshes active periodization queries.

## Architecture

### `guidance` Domain

Coach gets two new structured concepts:

- `CoachProgramState`: the user's program lifecycle context.
- `CoachProgramDraft`: a validated program draft that can be reviewed and saved.

Coach tools expand from workout generation and context reads to program setup:

- `get_program_context` as a server-executable tool for model-visible program context.
- `start_program_builder` as a client-executable tool that opens the intake UI.
- `draft_training_program` as a server-executable tool that returns a structured draft.

The tool split keeps side effects explicit. `draft_training_program` produces data only. Saving is a separate confirmed client action.

The UI may also load active program context directly through existing React Query hooks so the Coach screen can show proactive builder primers before the model is invoked.

### `periodization` Domain

Periodization should expose a program-save boundary that accepts a structured draft:

- create or reset the active mesocycle
- create session templates in the requested order
- resolve exercise references against the catalog
- persist sets, reps, load increments, notes, progression rules, and session focus

If the current repository can only seed fixed templates for `custom`, it should be extended surgically rather than bypassed from Coach.

### `fitness` Domain

The builder can read the exercise catalog through existing guidance/fitness repository seams. It should not create workout records during program setup. Workouts remain generated or started from the active program later.

## Data Shapes

### Program State

```ts
interface CoachProgramState {
  status: "no_active_program" | "active_program" | "ending_soon" | "completed_program";
  activeProgram: ActiveMesocycleProgram | null;
  suggestedAction: "start_program_builder" | "plan_next_program" | "continue_current_program";
}
```

### Intake

```ts
interface CoachProgramIntake {
  primaryGoal: "strength" | "hypertrophy" | "general";
  daysPerWeek: number;
  sessionLengthMinutes: number;
  durationWeeks: number;
  equipment: string[];
  constraints: string[];
  trainingAge: "beginner" | "intermediate" | "advanced";
  recentConsistency: "low" | "moderate" | "high";
  includeExercises: string[];
  avoidExercises: string[];
  notes: string | null;
}
```

### Draft

```ts
interface CoachProgramDraft {
  name: string;
  goalFocus: SessionFocus;
  protocol: "custom";
  startDate: string;
  durationWeeks: number;
  notes: string;
  rationale: string;
  sessions: Array<{
    name: string;
    sessionFocus: SessionFocus | null;
    setsPerExercise: number | null;
    repRange: string | null;
    progressionRule: string | null;
    exercises: Array<{
      exerciseName: string;
      targetSets: number | null;
      targetReps: string | null;
      loadIncrementKg: number | null;
      notes: string | null;
    }>;
  }>;
}
```

The draft uses exercise names during generation because the model should not invent database IDs. The save boundary resolves names to known exercises and returns validation errors for unresolved entries.

## UI Design

The first version should stay inside the current Coach screen.

- Add state-aware primer buttons below the chat history.
- Render `start_program_builder` as an in-chat tool card.
- Use compact structured controls for intake: selects, number inputs, checkboxes, and text inputs.
- Render the generated draft as a review card with session sections.
- Provide three actions: confirm, revise intake, cancel.
- Keep the chat input available, but disable save while a draft is being generated or persisted.

This avoids a new route and keeps the feature discoverable from the existing Coach interaction.

## Error Handling

- Missing provider key: existing Coach configuration behavior continues to block AI drafting.
- No authenticated user: program context and save actions fail with a clear authentication error.
- Draft validation failure: show the invalid fields and keep the intake/draft open.
- Unresolved exercises: show the exercise names that could not be resolved and ask the user to revise.
- Save failure: do not discard the draft; show a retryable error.
- Active workout conflict: if there is an unfinished workout tied to the current mesocycle, require confirmation before resetting the active program.

## Verification

- Add focused tests for pure program-state classification and draft validation if the repo has a test harness by implementation time.
- If no test script exists, keep pure logic in small functions and manually verify through build/lint.
- Required repo verification remains sequential:
  1. `npm run build`
  2. `npm run lint`

## Milestones

### Milestone 1: Context-Aware Entry

- Load active program context into Coach.
- Classify program state.
- Show state-aware primer actions.
- No database writes.

### Milestone 2: Guided Intake Tool

- Add `start_program_builder`.
- Render structured intake inside Coach.
- Store intake in `useCoachScreen` state.
- No database writes.

### Milestone 3: Structured Draft

- Add draft contract and validation.
- Add `draft_training_program`.
- Include profile, recent workouts, active/latest program, and exercise catalog context.
- Render a reviewable draft card.
- No database writes.

### Milestone 4: Confirmed Save

- Add periodization save boundary for drafted custom programs.
- Resolve exercises safely.
- Create or reset active mesocycle only after user confirmation.
- Refresh active program queries.

### Milestone 5: Follow-Up Coaching

- After save, Coach summarizes the program and suggests the first session.
- Existing next-workout generation uses the newly active program.

## Non-Goals For First Build

- Editing arbitrary existing workouts.
- Fully adaptive autoregulation after every workout.
- Calendar scheduling.
- Multi-user coach/admin workflows.
- Medical screening beyond capturing user-stated constraints.
- Replacing the existing workout execution screen.
