# Presence Shell + Context-Aware Summon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/coach` page with a global presence orb that opens a bottom-sheet summon surface — context-aware, tool-equipped, rendering inline artifacts (a volume chart, a workout draft) — keeping the agent on the read/synthesize/render side of the sub-project 3 "act" line.

**Architecture:** The existing `guidance` agent chassis is extended, not rewritten. New `ScreenContext` (read-only) and `CoachArtifact` types ride the existing typed request/tool-result protocol. Coach conversation state lifts from the page-scoped `useCoachScreen` hook into an app-root `PresenceAgentProvider` (React context, fresh each launch). A `PresenceMark` orb and `SummonSurface` bottom sheet mount in the protected shell. New tools (`get_training_volume`, `propose_workout`) attach artifacts that a client `ArtifactRenderer` registry draws. `propose_workout` returns a draft that **Apply** commits via the existing create-workout flow.

**Tech Stack:** React 18 + TypeScript + Vite, Tailwind + shadcn/ui (`sheet.tsx`), Redux Toolkit + React Query, react-router-dom v6, Vercel AI SDK (`ToolLoopAgent`), Supabase.

**Spec:** `docs/superpowers/specs/2026-06-04-presence-summon-design.md`

---

## Verification Note (read first)

This repo has **no test runner** (`package.json` has no test script; CODEMAP confirms). Per `AGENTS.md`, verification is:

1. `npm run build`
2. `npm run lint` (run **sequentially**, never in parallel — Vite writes transient `vite.config.ts.timestamp-*.mjs` files that make ESLint fail with `ENOENT`; expected baseline is **8 warnings, 0 errors**)

Do **not** introduce a test framework (AGENTS.md Rule 2: nothing speculative). Each task is verified with build + lint + an explicit **manual check**. Local Supabase (Docker) must be running per `README.md` for any task that exercises the data tools (Tasks 7, 8).

**Ordering principle:** the new surface is built **additively alongside `/coach`** (Tasks 1–9) and `/coach` is removed only at the end (Task 10). Every task leaves the app shippable.

## File Structure

**Create:**
- `src/domains/guidance/agent/screenContext.ts` — `ScreenContext` type + the client-side assembler `buildScreenContext`.
- `src/domains/guidance/hooks/PresenceAgentProvider.tsx` — context provider owning surface open-state + conversation + send loop.
- `src/domains/guidance/hooks/usePresenceAgent.ts` — the hook consumers call.
- `src/domains/guidance/ui/SummonSurface.tsx` — the bottom sheet.
- `src/domains/guidance/ui/ArtifactRenderer.tsx` — maps `artifact.type` → renderer.
- `src/domains/guidance/ui/artifacts/VolumeChartArtifact.tsx`
- `src/domains/guidance/ui/artifacts/WorkoutDraftArtifact.tsx`
- `src/components/layout/PresenceMark.tsx` — the floating orb.

**Modify:**
- `src/domains/guidance/agent/contracts.ts` — `ScreenContext` re-export, `CoachArtifact`, `artifact` on `CoachToolResultPayload`, `screenContext` on `CoachAgentRequest`, new tool names, schemas.
- `src/domains/guidance/agent/tools.ts` — add `get_training_volume`, `propose_workout`; drop `generate_strength_workout`.
- `src/domains/guidance/agent/runtime.ts` — inject `ScreenContext` into instructions; add `get_training_volume` server tool; map new tool execution environments.
- `src/domains/guidance/agent/transport.ts` — pass `screenContext`.
- `src/domains/guidance/agent/http.ts` — forward `screenContext` to the runtime.
- `src/domains/guidance/hooks/useWorkoutGenerator.ts` — split build vs. commit (`buildWorkoutPlan`, `commitWorkoutPlan`).
- `src/components/layout/MainAppLayout.tsx` — mount provider + orb + surface; (Task 10) remove `/coach` route and the FAB block.
- `src/components/layout/navigationItems.ts` — (Task 10) remove the Coach item.
- `CODEMAP.md` — (Task 11).

**Delete (Task 10):**
- `src/pages/Coach.tsx`. (`CoachScreen` is superseded by `SummonSurface`; `Chat`/`ChatPrimers` building blocks may be reused or removed if unreferenced.)

---

### Task 1: Contracts — `ScreenContext`, `CoachArtifact`, payload + request extensions

**Files:**
- Create: `src/domains/guidance/agent/screenContext.ts`
- Modify: `src/domains/guidance/agent/contracts.ts`

- [ ] **Step 1: Define `ScreenContext` and its assembler**

Create `src/domains/guidance/agent/screenContext.ts`:

```ts
import { z } from "zod";

export type ScreenName =
  | "home"
  | "workout"
  | "analytics"
  | "profile"
  | "other";

export interface ScreenContext {
  route: string;
  screen: ScreenName;
  focus?: {
    workoutInProgress?: boolean;
    activeWorkoutId?: string;
    analyticsRange?: { start: string; end: string };
  };
}

export const screenContextSchema = z.object({
  route: z.string(),
  screen: z.enum(["home", "workout", "analytics", "profile", "other"]),
  focus: z
    .object({
      workoutInProgress: z.boolean().optional(),
      activeWorkoutId: z.string().optional(),
      analyticsRange: z
        .object({ start: z.string(), end: z.string() })
        .optional(),
    })
    .optional(),
});

const screenForRoute = (route: string): ScreenName => {
  if (route === "/") return "home";
  if (route.startsWith("/workout")) return "workout";
  if (route.startsWith("/analytics")) return "analytics";
  if (route.startsWith("/profile")) return "profile";
  return "other";
};

export interface BuildScreenContextInput {
  route: string;
  workoutInProgress?: boolean;
  activeWorkoutId?: string | null;
  analyticsRange?: { start: string; end: string } | null;
}

export const buildScreenContext = ({
  route,
  workoutInProgress,
  activeWorkoutId,
  analyticsRange,
}: BuildScreenContextInput): ScreenContext => {
  const screen = screenForRoute(route);
  const focus: NonNullable<ScreenContext["focus"]> = {};
  if (typeof workoutInProgress === "boolean")
    focus.workoutInProgress = workoutInProgress;
  if (activeWorkoutId) focus.activeWorkoutId = activeWorkoutId;
  if (screen === "analytics" && analyticsRange)
    focus.analyticsRange = analyticsRange;
  return Object.keys(focus).length > 0
    ? { route, screen, focus }
    : { route, screen };
};

export const formatScreenContextForPrompt = (
  context: ScreenContext | undefined
): string => {
  if (!context) return "";
  const bits = [`route ${context.route}`, `screen ${context.screen}`];
  if (context.focus?.workoutInProgress) bits.push("a workout is in progress");
  if (context.focus?.analyticsRange)
    bits.push(
      `analytics range ${context.focus.analyticsRange.start}..${context.focus.analyticsRange.end}`
    );
  return `\n\nCurrent context: the user is on ${bits.join(", ")}. Use this to ground your answer; do not restate it.`;
};
```

- [ ] **Step 2: Add `CoachArtifact`, extend the result payload and request in `contracts.ts`**

In `src/domains/guidance/agent/contracts.ts`, add the import at the top:

```ts
import { screenContextSchema, type ScreenContext } from "./screenContext";
```

Replace the `coachToolNames` tuple with the new tool set:

```ts
export const coachToolNames = [
  "propose_workout",
  "get_user_profile_summary",
  "get_recent_workout_summary",
  "get_training_volume",
] as const;
```

Add the artifact union and re-export `ScreenContext` (place after `CoachToolName`):

```ts
export type { ScreenContext } from "./screenContext";

export type CoachArtifact =
  | {
      type: "volume_chart";
      title: string;
      range: { start: string; end: string };
      series: Array<{ label: string; current: number; goal: number }>;
    }
  | {
      type: "workout_draft";
      title: string;
      rationale: string;
      sessionFocus: string;
      exercises: Array<{ name: string; sets: number }>;
      apply: { startWorkoutPayload: Record<string, unknown> };
    };
```

Extend `CoachToolResultPayload`:

```ts
export interface CoachToolResultPayload {
  message: string;
  data?: unknown;
  nextRoute?: string;
  artifact?: CoachArtifact;
}
```

Add `screenContext` to `CoachAgentRequest`:

```ts
export interface CoachAgentRequest {
  messages: CoachConversationMessage[];
  provider: CoachLlmProvider;
  model?: string;
  auth?: CoachAgentAuthContext;
  screenContext?: ScreenContext;
}
```

- [ ] **Step 3: Update the zod schemas in `contracts.ts`**

Add the artifact schema above `coachToolResultPayloadSchema`:

```ts
const coachArtifactSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("volume_chart"),
    title: z.string(),
    range: z.object({ start: z.string(), end: z.string() }),
    series: z.array(
      z.object({
        label: z.string(),
        current: z.number(),
        goal: z.number(),
      })
    ),
  }),
  z.object({
    type: z.literal("workout_draft"),
    title: z.string(),
    rationale: z.string(),
    sessionFocus: z.string(),
    exercises: z.array(
      z.object({ name: z.string(), sets: z.number() })
    ),
    apply: z.object({ startWorkoutPayload: z.record(z.string(), z.unknown()) }),
  }),
]);
```

Update `coachToolResultPayloadSchema` to include the artifact:

```ts
const coachToolResultPayloadSchema = z.object({
  data: z.unknown().optional(),
  message: z.string(),
  nextRoute: z.string().optional(),
  artifact: coachArtifactSchema.optional(),
});
```

Add `screenContext` to `coachAgentRequestSchema`:

```ts
export const coachAgentRequestSchema = z.object({
  auth: z
    .object({
      supabaseAccessToken: z.string().min(1).nullable().optional(),
    })
    .optional(),
  messages: z.array(coachConversationMessageSchema),
  model: z.string().optional(),
  provider: z.enum(coachLlmProviders),
  screenContext: screenContextSchema.optional(),
});
```

- [ ] **Step 4: Verify (build + lint, sequential)**

Run: `npm run build`
Expected: succeeds. There will be **type errors elsewhere** referencing the removed `generate_strength_workout` name (in `tools.ts`, `runtime.ts`, `useCoachScreen.ts`) — those are fixed in Tasks 2, 5, 8. If the build fails **only** with `generate_strength_workout`-related errors, that is expected at this checkpoint; proceed. If it fails for any other reason, fix before continuing.

Then run: `npm run lint`
Expected: no new errors from the new file beyond the baseline.

- [ ] **Step 5: Commit**

```bash
git add src/domains/guidance/agent/screenContext.ts src/domains/guidance/agent/contracts.ts
git commit -m "feat(guidance): add ScreenContext + CoachArtifact contracts"
```

---

### Task 2: Thread `ScreenContext` through transport → http → runtime

**Files:**
- Modify: `src/domains/guidance/agent/transport.ts`
- Modify: `src/domains/guidance/agent/http.ts`
- Modify: `src/domains/guidance/agent/runtime.ts`

- [ ] **Step 1: Pass `screenContext` in `transport.ts`**

In `src/domains/guidance/agent/transport.ts`, add to the request interface and body:

```ts
import type { ScreenContext } from "@/domains/guidance/agent/contracts";

interface SendCoachMessageRequest {
  auth?: CoachAgentAuthContext;
  messages: CoachConversationMessage[];
  provider: LlmProviderPreference;
  model?: string;
  screenContext?: ScreenContext;
}
```

Add `screenContext` to the destructured params and to the JSON body:

```ts
export const sendCoachMessage = async ({
  auth,
  messages,
  provider,
  model,
  screenContext,
}: SendCoachMessageRequest): Promise<CoachAgentResponse> => {
  const response = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auth, messages, provider, model, screenContext }),
  });
  // ...rest unchanged
```

- [ ] **Step 2: Forward `screenContext` in `http.ts`**

In `handleCoachAgentRequest` (`src/domains/guidance/agent/http.ts`), add it to the `runCoachAgentTurn` call:

```ts
    const agentResponse = await runCoachAgentTurn({
      auth: request.auth,
      env,
      messages: request.messages,
      model: request.model,
      provider: request.provider,
      screenContext: request.screenContext,
    });
```

- [ ] **Step 3: Inject `ScreenContext` into runtime instructions**

In `src/domains/guidance/agent/runtime.ts`:

Add to the imports:

```ts
import { formatScreenContextForPrompt } from "./screenContext.js";
import type { ScreenContext } from "./contracts.js";
```

Extend the params type:

```ts
interface RunCoachAgentTurnParams extends CoachAgentRequest {
  env: CoachAgentRuntimeEnvironment;
}
```

(`CoachAgentRequest` already includes the optional `screenContext` from Task 1, so this needs no change beyond destructuring.)

In `runCoachAgentTurn`, destructure `screenContext` and append it to the instructions:

```ts
export const runCoachAgentTurn = async ({
  auth,
  env,
  messages,
  model,
  provider,
  screenContext,
}: RunCoachAgentTurnParams): Promise<CoachAgentResponse> => {
  try {
    const serverContext = await createCoachServerDataContext(env, auth);
    // ...
    const agent = new ToolLoopAgent<never, CoachToolSet>({
      id: "stratos-coach",
      instructions: `${coachAgentInstructions}${formatScreenContextForPrompt(screenContext)}`,
      // ...rest unchanged
```

- [ ] **Step 4: Verify (build + lint, sequential)**

Run: `npm run build`
Expected: same `generate_strength_workout` errors as Task 1 may remain (fixed in Task 8); no new errors from these files.
Run: `npm run lint`
Expected: baseline.

- [ ] **Step 5: Commit**

```bash
git add src/domains/guidance/agent/transport.ts src/domains/guidance/agent/http.ts src/domains/guidance/agent/runtime.ts
git commit -m "feat(guidance): thread ScreenContext into the coach runtime prompt"
```

---

### Task 3: `PresenceAgentProvider` + `usePresenceAgent` (lift coach state to app root)

**Files:**
- Create: `src/domains/guidance/hooks/usePresenceAgent.ts`
- Create: `src/domains/guidance/hooks/PresenceAgentProvider.tsx`

This moves the conversation + send loop out of `useCoachScreen` into an app-root context so it survives navigation. The send loop is the same shape as the one in `useCoachScreen.handleSend`, plus it assembles `ScreenContext` and exposes `isOpen`/`summon`/`dismiss`.

- [ ] **Step 1: Define the context shape and hook**

Create `src/domains/guidance/hooks/usePresenceAgent.ts`:

```ts
import { createContext, useContext } from "react";

import type {
  CoachConversationMessage,
} from "@/domains/guidance/agent/contracts";

export interface PresenceAgentContextValue {
  isOpen: boolean;
  summon: () => void;
  dismiss: () => void;
  toggle: () => void;
  conversation: CoachConversationMessage[];
  isLoading: boolean;
  statusMessage: string | null;
  input: string;
  setInput: (value: string) => void;
  send: (text?: string) => Promise<void>;
  applyWorkoutDraft: (startWorkoutPayload: Record<string, unknown>) => void;
  isCoachConfigured: boolean;
  configurationMessage: string | null;
}

export const PresenceAgentContext =
  createContext<PresenceAgentContextValue | null>(null);

export const usePresenceAgent = (): PresenceAgentContextValue => {
  const value = useContext(PresenceAgentContext);
  if (!value) {
    throw new Error(
      "usePresenceAgent must be used within a PresenceAgentProvider."
    );
  }
  return value;
};
```

- [ ] **Step 2: Write the provider**

Create `src/domains/guidance/hooks/PresenceAgentProvider.tsx`. This adapts `useCoachScreen`'s send loop (provider-config checks, the 4-step client-tool loop, navigation on `nextRoute`) and adds `ScreenContext` assembly + open-state. The workout draft `Apply` path commits via `commitWorkoutPlan` (added in Task 8); until then `applyWorkoutDraft` dispatches `startWorkout` directly with the serialized payload.

```tsx
import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  createCoachErrorMessage,
  createCoachToolResultMessage,
  createCoachUserMessage,
  isClientCoachToolCallMessage,
  type CoachConversationMessage,
} from "@/domains/guidance/agent/contracts";
import { buildScreenContext } from "@/domains/guidance/agent/screenContext";
import { sendCoachMessage } from "@/domains/guidance/agent/transport";
import { executeCoachTool, getCoachToolLabel } from "@/domains/guidance/agent/tools";
import {
  buildMissingProviderConfigurationMessage,
  providerRequiresApiKey,
  readLlmPreferences,
} from "@/domains/guidance/data/llmPreferences";
import { useProposeWorkout } from "@/domains/guidance/hooks/useWorkoutGenerator";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import { startWorkout } from "@/state/workout/workoutSlice";
import {
  selectCurrentWorkout,
  selectIsWorkoutActive,
} from "@/state/workout/workoutSlice";
import {
  PresenceAgentContext,
  type PresenceAgentContextValue,
} from "@/domains/guidance/hooks/usePresenceAgent";

export const PresenceAgentProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const isWorkoutActive = useAppSelector(selectIsWorkoutActive);
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const proposeWorkout = useProposeWorkout();

  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<CoachConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const conversationRef = useRef<CoachConversationMessage[]>([]);
  conversationRef.current = conversation;

  const llmPreferences = readLlmPreferences();
  const isCoachConfigured = !providerRequiresApiKey(llmPreferences.provider);
  const configurationMessage = isCoachConfigured
    ? null
    : buildMissingProviderConfigurationMessage(llmPreferences.provider);

  const summon = useCallback(() => setIsOpen(true), []);
  const dismiss = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((open) => !open), []);

  const applyWorkoutDraft = useCallback(
    (startWorkoutPayload: Record<string, unknown>) => {
      dispatch(startWorkout(startWorkoutPayload as never));
      setIsOpen(false);
      navigate("/workout");
    },
    [dispatch, navigate]
  );

  const send = useCallback(
    async (textArg?: string) => {
      if (isLoading) return;
      const messageToSend = (textArg ?? input).trim();
      if (!messageToSend) return;

      const { model, provider } = readLlmPreferences();
      if (providerRequiresApiKey(provider)) {
        const missing = buildMissingProviderConfigurationMessage(provider);
        toast.error(missing);
        setConversation((prev) => [...prev, createCoachErrorMessage(missing)]);
        return;
      }

      const screenContext = buildScreenContext({
        route: location.pathname,
        workoutInProgress: isWorkoutActive,
        activeWorkoutId: currentWorkout?.id ?? null,
      });

      let nextConversation = [
        ...conversationRef.current,
        createCoachUserMessage(messageToSend),
      ];
      let pendingNavigation: string | undefined;
      setConversation(nextConversation);
      setInput("");
      setIsLoading(true);
      setStatusMessage("Coach is reviewing your training context...");

      try {
        for (let step = 0; step < 4; step += 1) {
          const agentResponse = await sendCoachMessage({
            auth: { supabaseAccessToken: session?.access_token ?? null },
            messages: nextConversation,
            provider,
            model,
            screenContext,
          });

          if (agentResponse.messages.length > 0) {
            nextConversation = [...nextConversation, ...agentResponse.messages];
            setConversation(nextConversation);
          }

          if (agentResponse.status !== "client_tool_required") {
            setStatusMessage(null);
            return;
          }

          const clientToolCalls = agentResponse.messages.filter(
            isClientCoachToolCallMessage
          );
          if (clientToolCalls.length === 0) {
            throw new Error(
              "Coach requested a client tool without returning a client tool call."
            );
          }

          setStatusMessage(
            `Running ${getCoachToolLabel(clientToolCalls[0].toolName)}...`
          );

          const toolResults = await Promise.all(
            clientToolCalls.map(async (toolCall) => {
              try {
                const result = await executeCoachTool(toolCall, {
                  proposeWorkout,
                });
                if (result.nextRoute) pendingNavigation = result.nextRoute;
                return createCoachToolResultMessage({
                  execution: toolCall.execution,
                  output: result,
                  toolCallId: toolCall.toolCallId,
                  toolName: toolCall.toolName,
                });
              } catch (error) {
                return createCoachToolResultMessage({
                  execution: toolCall.execution,
                  isError: true,
                  output: {
                    message:
                      error instanceof Error
                        ? error.message
                        : "Coach tool execution failed.",
                  },
                  toolCallId: toolCall.toolCallId,
                  toolName: toolCall.toolName,
                });
              }
            })
          );

          nextConversation = [...nextConversation, ...toolResults];
          setConversation(nextConversation);
          setStatusMessage("Coach is finalizing...");
        }
        throw new Error("Coach exceeded the client tool loop limit.");
      } catch (error) {
        setConversation((prev) => [
          ...prev,
          createCoachErrorMessage(
            `Sorry, I hit an error: ${
              error instanceof Error ? error.message : "Unknown error"
            }.`
          ),
        ]);
      } finally {
        setIsLoading(false);
        setStatusMessage(null);
        if (pendingNavigation) {
          setIsOpen(false);
          navigate(pendingNavigation);
        }
      }
    },
    [
      currentWorkout?.id,
      input,
      isLoading,
      isWorkoutActive,
      location.pathname,
      navigate,
      proposeWorkout,
      session?.access_token,
    ]
  );

  const value = useMemo<PresenceAgentContextValue>(
    () => ({
      isOpen,
      summon,
      dismiss,
      toggle,
      conversation,
      isLoading,
      statusMessage,
      input,
      setInput,
      send,
      applyWorkoutDraft,
      isCoachConfigured,
      configurationMessage,
    }),
    [
      applyWorkoutDraft,
      configurationMessage,
      conversation,
      dismiss,
      input,
      isCoachConfigured,
      isLoading,
      isOpen,
      send,
      statusMessage,
      summon,
      toggle,
    ]
  );

  return (
    <PresenceAgentContext.Provider value={value}>
      {children}
    </PresenceAgentContext.Provider>
  );
};
```

> Note: `useProposeWorkout`, `proposeWorkout` as a `CoachToolContext` field, and the `propose_workout` tool are introduced in Task 8. Until Task 8 lands, this file will not type-check against `executeCoachTool`'s context. To keep Task 3 shippable on its own, **temporarily** pass `{ generateWorkout: async () => { throw new Error("not wired"); } }` matching the *current* `CoachToolContext`, and import nothing from `useWorkoutGenerator` yet. Replace with the `proposeWorkout` wiring in Task 8. (The provider is not mounted until Task 4, so this stub is never executed.)

- [ ] **Step 3: Verify (build + lint, sequential)**

Run: `npm run build` then `npm run lint`.
Expected: builds with the Task-1 `generate_strength_workout` errors only; no new errors from the provider files.

- [ ] **Step 4: Commit**

```bash
git add src/domains/guidance/hooks/usePresenceAgent.ts src/domains/guidance/hooks/PresenceAgentProvider.tsx
git commit -m "feat(guidance): PresenceAgentProvider lifts coach state to app root"
```

---

### Task 4: Mount the provider + a minimal `SummonSurface` and `PresenceMark`

**Files:**
- Create: `src/components/layout/PresenceMark.tsx`
- Create: `src/domains/guidance/ui/SummonSurface.tsx`
- Modify: `src/components/layout/MainAppLayout.tsx`

This task wires a working orb + sheet that holds a conversation (text only — artifacts come in Task 6). `/coach` stays untouched.

- [ ] **Step 1: Write `PresenceMark`**

Create `src/components/layout/PresenceMark.tsx`:

```tsx
import { Sparkles } from "lucide-react";

import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";
import { cn } from "@/lib/utils/cn";

const PresenceMark = () => {
  const { toggle, isOpen } = usePresenceAgent();

  return (
    <button
      type="button"
      aria-label="Open coach"
      aria-expanded={isOpen}
      onClick={toggle}
      className={cn(
        "fixed bottom-20 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full",
        "bg-primary text-primary-foreground shadow-lg transition-transform",
        "hover:bg-primary/90 active:scale-95 md:bottom-6"
      )}
    >
      <Sparkles size={22} aria-hidden="true" />
    </button>
  );
};

export default PresenceMark;
```

- [ ] **Step 2: Write a minimal `SummonSurface` (text conversation only)**

Create `src/domains/guidance/ui/SummonSurface.tsx`. It reuses the existing `Chat` flattening idea inline but renders directly from the provider conversation. (Artifacts are added in Task 6.)

```tsx
import { Sheet, SheetContent } from "@/components/core/sheet";
import { Button } from "@/components/core/button";
import { Input } from "@/components/core/input";
import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";
import { cn } from "@/lib/utils/cn";

const SummonSurface = () => {
  const {
    isOpen,
    dismiss,
    conversation,
    input,
    setInput,
    send,
    isLoading,
    statusMessage,
    configurationMessage,
  } = usePresenceAgent();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? undefined : dismiss())}>
      <SheetContent
        side="bottom"
        className="flex h-[80svh] flex-col gap-0 rounded-t-2xl border-border bg-card p-0"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted" />

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {conversation.length === 0 ? (
            <p className="px-1 pt-4 text-sm text-muted-foreground">
              Ask about your training, or request an adapted session.
            </p>
          ) : (
            conversation.map((message) => {
              if (message.kind === "user") {
                return (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl bg-accent px-3 py-2 text-sm text-accent-foreground">
                      {message.content}
                    </div>
                  </div>
                );
              }
              if (message.kind === "assistant" || message.kind === "error") {
                return (
                  <div key={message.id} className="flex justify-start">
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                        message.kind === "error"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                );
              }
              return null;
            })
          )}
          {statusMessage ? (
            <p className="px-1 text-xs text-muted-foreground">{statusMessage}</p>
          ) : null}
        </div>

        {configurationMessage ? (
          <p className="px-4 pb-2 text-xs text-destructive">
            {configurationMessage}
          </p>
        ) : null}

        <form
          className="flex items-center gap-2 border-t border-border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask your coach..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default SummonSurface;
```

> Confirm the exact import paths for `Button` and `Input` against `src/components/core/` before writing (the repo uses lowercase filenames, e.g. `@/components/core/button`). If a path differs, match the repo.

- [ ] **Step 3: Mount provider + orb + surface in `MainAppLayout.tsx`**

In `src/components/layout/MainAppLayout.tsx`, add imports:

```ts
import PresenceMark from "@/components/layout/PresenceMark";
import SummonSurface from "@/domains/guidance/ui/SummonSurface";
import { PresenceAgentProvider } from "@/domains/guidance/hooks/PresenceAgentProvider";
```

Wrap the existing returned shell with `PresenceAgentProvider` (it is already inside the Redux `Provider` and the Router, so `useAppSelector`/`useLocation` work), and render the orb + surface inside the `SidebarInset`, after the FAB block:

```tsx
  return (
    <PresenceAgentProvider>
      <SidebarProvider defaultOpen={false}>
        {/* ...existing NavBar / SidebarInset / Routes / FAB unchanged... */}
        <SidebarInset className="app-shell">
          {/* ...existing content... */}

          {/* existing shouldShowGlobalFab block stays for now (removed in Task 10) */}

          <PresenceMark />
          <SummonSurface />

          {/* ...existing dialogs (protein, sun, add-exercise) unchanged... */}
        </SidebarInset>
      </SidebarProvider>
    </PresenceAgentProvider>
  );
```

- [ ] **Step 4: Verify (build + lint, sequential)**

Run: `npm run build` then `npm run lint`.
Expected: Task-1 `generate_strength_workout` errors only; no new errors.

- [ ] **Step 5: Manual check**

Start local Supabase + dev server (`npm run supabase:start`, `npm run dev`), log in. On every primary screen the orb appears bottom-right. Tap it → the bottom sheet opens. Navigate to another tab with the sheet closed, reopen — the **conversation persists** (type a message first to confirm; note Coach only sends with a configured provider). Close the app/reload → conversation is empty (fresh each launch).

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/PresenceMark.tsx src/domains/guidance/ui/SummonSurface.tsx src/components/layout/MainAppLayout.tsx
git commit -m "feat(presence): global orb + bottom-sheet summon surface (text)"
```

---

### Task 5: Quick-action chips in the surface

**Files:**
- Modify: `src/domains/guidance/ui/SummonSurface.tsx`
- Modify: `src/components/layout/MainAppLayout.tsx`

The four deprecated FAB actions become one-tap chips. `useQuickActions` already lives in `MainAppLayout` and renders its dialogs there; pass its handlers into the surface.

- [ ] **Step 1: Accept quick-action props on `SummonSurface`**

Add a props interface and a chip row above the conversation. Replace the component signature and add the row after the grip:

```tsx
export interface SummonSurfaceQuickActions {
  onStartWorkout: () => void;
  onLogSingleExercise: () => void;
  onLogProtein: () => void;
  onLogSunExposure: () => void;
}

const SummonSurface = ({
  quickActions,
}: {
  quickActions: SummonSurfaceQuickActions;
}) => {
  // ...existing usePresenceAgent destructure...

  const chips: Array<{ label: string; onClick: () => void }> = [
    { label: "Start workout", onClick: quickActions.onStartWorkout },
    { label: "Single exercise", onClick: quickActions.onLogSingleExercise },
    { label: "Protein", onClick: quickActions.onLogProtein },
    { label: "Sun", onClick: quickActions.onLogSunExposure },
  ];
```

Render the row immediately after the grip `<div ... />`:

```tsx
        <div className="flex flex-wrap gap-2 px-4 pb-1 pt-3">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => {
                dismiss();
                chip.onClick();
              }}
              className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-foreground hover:bg-accent"
            >
              {chip.label}
            </button>
          ))}
        </div>
```

- [ ] **Step 2: Pass handlers from `MainAppLayout`**

`MainAppLayout` already destructures `useQuickActions()`. Pass them in:

```tsx
          <SummonSurface
            quickActions={{
              onStartWorkout: handleAddWorkout,
              onLogSingleExercise: handleAddExercise,
              onLogProtein: handleLogProtein,
              onLogSunExposure: handleLogSunExposure,
            }}
          />
```

- [ ] **Step 3: Verify (build + lint, sequential)**

Run: `npm run build` then `npm run lint`. Expected: Task-1 errors only.

- [ ] **Step 4: Manual check**

Open the orb. The four chips show. Tap **Start workout** → sheet closes, navigates to `/workout` with a new workout started. Tap **Protein** / **Sun** / **Single exercise** → sheet closes and the existing dialog opens (the same dialogs the FAB used).

- [ ] **Step 5: Commit**

```bash
git add src/domains/guidance/ui/SummonSurface.tsx src/components/layout/MainAppLayout.tsx
git commit -m "feat(presence): quick-action chips wired to existing quick actions"
```

---

### Task 6: Inline artifact rendering

**Files:**
- Create: `src/domains/guidance/ui/artifacts/VolumeChartArtifact.tsx`
- Create: `src/domains/guidance/ui/artifacts/WorkoutDraftArtifact.tsx`
- Create: `src/domains/guidance/ui/ArtifactRenderer.tsx`
- Modify: `src/domains/guidance/ui/SummonSurface.tsx`

- [ ] **Step 1: Write the volume chart artifact**

Create `src/domains/guidance/ui/artifacts/VolumeChartArtifact.tsx`. Use a simple bar layout from the artifact's `series` (current vs. goal); do not depend on remote data — the artifact is self-contained.

```tsx
import type { CoachArtifact } from "@/domains/guidance/agent/contracts";

type VolumeChart = Extract<CoachArtifact, { type: "volume_chart" }>;

const VolumeChartArtifact = ({ artifact }: { artifact: VolumeChart }) => {
  const max = Math.max(
    1,
    ...artifact.series.map((point) => Math.max(point.current, point.goal))
  );

  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {artifact.title}
      </p>
      <div className="mt-3 space-y-2">
        {artifact.series.map((point) => (
          <div key={point.label} className="space-y-1">
            <div className="flex justify-between text-xs text-foreground">
              <span>{point.label}</span>
              <span className="text-muted-foreground">
                {point.current}/{point.goal}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, (point.current / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VolumeChartArtifact;
```

- [ ] **Step 2: Write the workout draft artifact (with Apply)**

Create `src/domains/guidance/ui/artifacts/WorkoutDraftArtifact.tsx`:

```tsx
import { Button } from "@/components/core/button";
import type { CoachArtifact } from "@/domains/guidance/agent/contracts";
import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";

type WorkoutDraft = Extract<CoachArtifact, { type: "workout_draft" }>;

const WorkoutDraftArtifact = ({ artifact }: { artifact: WorkoutDraft }) => {
  const { applyWorkoutDraft } = usePresenceAgent();

  return (
    <div className="rounded-xl border border-primary/40 bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-primary">
        {artifact.title}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{artifact.rationale}</p>
      <ul className="mt-2 space-y-1">
        {artifact.exercises.map((exercise, index) => (
          <li
            key={`${exercise.name}-${index}`}
            className="flex justify-between text-sm text-foreground"
          >
            <span>{exercise.name}</span>
            <span className="text-muted-foreground">{exercise.sets} sets</span>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        className="mt-3 w-full"
        onClick={() => applyWorkoutDraft(artifact.apply.startWorkoutPayload)}
      >
        Apply &amp; start
      </Button>
    </div>
  );
};

export default WorkoutDraftArtifact;
```

- [ ] **Step 3: Write the renderer registry**

Create `src/domains/guidance/ui/ArtifactRenderer.tsx`:

```tsx
import type { CoachArtifact } from "@/domains/guidance/agent/contracts";
import VolumeChartArtifact from "@/domains/guidance/ui/artifacts/VolumeChartArtifact";
import WorkoutDraftArtifact from "@/domains/guidance/ui/artifacts/WorkoutDraftArtifact";

const ArtifactRenderer = ({ artifact }: { artifact: CoachArtifact }) => {
  switch (artifact.type) {
    case "volume_chart":
      return <VolumeChartArtifact artifact={artifact} />;
    case "workout_draft":
      return <WorkoutDraftArtifact artifact={artifact} />;
    default:
      return null;
  }
};

export default ArtifactRenderer;
```

- [ ] **Step 4: Render artifacts in `SummonSurface`**

In `SummonSurface.tsx`, import the renderer:

```tsx
import ArtifactRenderer from "@/domains/guidance/ui/ArtifactRenderer";
```

In the `conversation.map(...)`, add a branch for tool results that carry an artifact (before the `return null` fallback):

```tsx
              if (
                message.kind === "tool_result" &&
                message.output.artifact
              ) {
                return (
                  <div key={message.id} className="flex justify-start">
                    <div className="w-[90%]">
                      <ArtifactRenderer artifact={message.output.artifact} />
                    </div>
                  </div>
                );
              }
```

- [ ] **Step 5: Verify (build + lint, sequential)**

Run: `npm run build` then `npm run lint`. Expected: Task-1 errors only.

- [ ] **Step 6: Manual check**

Artifacts cannot be produced until Tasks 7–8 add the tools, so verify rendering with a temporary literal: in `SummonSurface`, briefly hardcode a `volume_chart` artifact into a dummy message, confirm it renders as bars, then remove it. (Do not commit the dummy.)

- [ ] **Step 7: Commit**

```bash
git add src/domains/guidance/ui/ArtifactRenderer.tsx src/domains/guidance/ui/artifacts/ src/domains/guidance/ui/SummonSurface.tsx
git commit -m "feat(presence): inline artifact renderer (volume chart, workout draft)"
```

---

### Task 7: `get_training_volume` server tool → `volume_chart` artifact

**Files:**
- Modify: `src/domains/guidance/agent/tools.ts`
- Modify: `src/domains/guidance/agent/runtime.ts`

- [ ] **Step 1: Declare the tool in `tools.ts`**

Add to `coachToolDefinitions`:

```ts
  get_training_volume: {
    description:
      "Read the user's current-week training volume by movement archetype (current vs. goal sets) so you can reason about volume gaps and render a chart.",
    execution: "server",
    inputSchema: emptyInputSchema,
    label: "Training Volume",
    name: "get_training_volume",
  },
```

Add `get_training_volume` to the server-tool branch of `executeCoachTool` that throws on the client (alongside the other server tools):

```ts
    case "get_recent_workout_summary":
    case "get_user_profile_summary":
    case "get_training_volume":
      throw new Error(
        `Coach tool ${toolCall.toolName} is server-executable and cannot run on the client.`
      );
```

- [ ] **Step 2: Implement the server tool in `runtime.ts`**

Add to the imports:

```ts
import {
  fetchWeeklyArchetypeSets,
} from "../../analytics/data/analyticsRepository.js";
import {
  buildVolumeProgressDisplayData,
  getCurrentWeekRange,
} from "../../analytics/hooks/useVolumeChart.js";
import type { CoachArtifact } from "./contracts.js";
```

In `createCoachAgentTools`, add the tool. It returns both a text summary and a `volume_chart` artifact built from `DisplayArchetypeData`:

```ts
  get_training_volume: tool({
    description: coachToolDefinitions.get_training_volume.description,
    inputSchema: coachToolDefinitions.get_training_volume.inputSchema,
    execute: async () => {
      if (!context.supabase || !context.user) {
        return createServerToolPayload(
          "The user is not authenticated, so training volume is unavailable."
        );
      }
      const range = getCurrentWeekRange();
      const weekly = await fetchWeeklyArchetypeSets(
        context.user.id,
        range.start,
        range.end
      );
      const progress = buildVolumeProgressDisplayData(weekly);
      const series = progress.map((point) => ({
        label: point.name,
        current: point.totalSets,
        goal: point.goal,
      }));
      const summary =
        series.length === 0
          ? "No training volume recorded for the current week yet."
          : series
              .map((p) => `${p.label}: ${p.current}/${p.goal} sets`)
              .join("; ");
      const artifact: CoachArtifact = {
        type: "volume_chart",
        title: "Volume · this week",
        range: { start: range.start, end: range.end },
        series,
      };
      return { message: summary, data: { series }, artifact };
    },
  }),
```

> `DisplayArchetypeData` fields are `name`, `totalSets`, and `goal` (confirmed in `src/domains/analytics/hooks/useVolumeChart.ts`).

- [ ] **Step 3: Map the artifact through the model output**

`coachToolResultPayloadToModelOutput` already serializes the whole payload as JSON when `data` is present, so the artifact survives the round-trip. Confirm `parseToolResultPayload`'s `json` branch preserves `artifact`: update its object construction to carry the artifact:

```ts
        return {
          isError: false,
          payload: {
            data: value.value.data,
            message: value.value.message,
            nextRoute:
              typeof value.value.nextRoute === "string"
                ? value.value.nextRoute
                : undefined,
            artifact:
              isRecord(value.value.artifact) &&
              typeof value.value.artifact.type === "string"
                ? (value.value.artifact as CoachArtifact)
                : undefined,
          },
        };
```

Also add `get_training_volume: "server"` to the `coachToolExecutionByName` record, and add the artifact-aware instruction to `coachAgentInstructions`:

```
- Use `get_training_volume` when the user asks about volume, stalled lifts, or "what should I change"; it renders a chart inline, so do not re-list every number.
```

- [ ] **Step 4: Verify (build + lint, sequential)**

Run: `npm run build` then `npm run lint`. Expected: Task-1 `generate_strength_workout` errors only (fixed next task).

- [ ] **Step 5: Manual check**

With local Supabase running and some logged sets this week, open the orb and ask "How's my volume this week?". The Coach calls `get_training_volume`; a volume bar chart renders inline; the reply references gaps without listing every number.

- [ ] **Step 6: Commit**

```bash
git add src/domains/guidance/agent/tools.ts src/domains/guidance/agent/runtime.ts
git commit -m "feat(coach): get_training_volume tool with inline volume_chart artifact"
```

---

### Task 8: `propose_workout` — split build/commit and return a `workout_draft`

**Files:**
- Modify: `src/domains/guidance/hooks/useWorkoutGenerator.ts`
- Modify: `src/domains/guidance/agent/tools.ts`
- Modify: `src/domains/guidance/agent/runtime.ts` (execution map + instructions)
- Modify: `src/domains/guidance/hooks/PresenceAgentProvider.tsx` (wire `proposeWorkout`)

- [ ] **Step 1: Split `generateStrengthWorkout` into build + commit**

In `src/domains/guidance/hooks/useWorkoutGenerator.ts`, locate the `dispatch(startWorkout({ ... }))` call near the end of `generateStrengthWorkout`. Extract its payload object into a named const and **stop dispatching inside the build path**. Refactor so the function returns the summary plus the payload:

```ts
export interface WorkoutPlanResult {
  summary: GeneratedWorkoutSummary;
  startWorkoutPayload: Parameters<typeof startWorkout>[0];
}

// Rename generateStrengthWorkout's body to buildWorkoutPlan and remove the dispatch.
export const buildWorkoutPlan = async ({
  baseExercises,
  movementArchetypes,
  planningContext,
  userId,
  workoutHistory,
}: Omit<GenerateStrengthWorkoutParams, "dispatch">): Promise<WorkoutPlanResult> => {
  // ...all existing logic up to the dispatch...
  const startWorkoutPayload = {
    initialExercises,
    mesocycleId: activeProgram?.mesocycle.id,
    mesocycleProtocol: activeProgram?.mesocycle.protocol,
    mesocycleSessionId: templateExerciseCount > 0 ? nextSession?.id : undefined,
    mesocycleWeek: activeProgram?.current_week,
    ownerUserId: userId,
    sessionFocus,
  };
  // ...build the summary object exactly as before...
  return { summary, startWorkoutPayload };
};

export const commitWorkoutPlan = (
  dispatch: AppDispatch,
  startWorkoutPayload: WorkoutPlanResult["startWorkoutPayload"]
) => {
  dispatch(startWorkout(startWorkoutPayload));
};

// Preserve the old behavior for any remaining caller:
export const generateStrengthWorkout = async (
  params: GenerateStrengthWorkoutParams
): Promise<GeneratedWorkoutSummary> => {
  const { dispatch, ...rest } = params;
  const { summary, startWorkoutPayload } = await buildWorkoutPlan(rest);
  commitWorkoutPlan(dispatch, startWorkoutPayload);
  return summary;
};
```

> The existing `useWorkoutGenerator` hook's `generateWorkout` keeps calling `generateStrengthWorkout` — unchanged behavior for the (now legacy) `WorkoutGenerator` UI button.

- [ ] **Step 2: Add a `useProposeWorkout` hook**

Still in `useWorkoutGenerator.ts`, add a hook that gathers the same data `useCoachScreen.generateWorkoutOnDemand` gathered and returns a function producing a `workout_draft` artifact payload (no dispatch):

```ts
import { useQueryClient } from "@tanstack/react-query";
import {
  fetchWeeklyArchetypeSets,
  type WeeklyArchetypeSetData,
} from "@/domains/analytics/data/analyticsRepository";
import { getCurrentWeekRange } from "@/domains/analytics/hooks/useVolumeChart";
import {
  fetchGuidanceExercises,
  fetchMovementArchetypes,
} from "@/domains/guidance/data/guidanceRepository";
import { getActiveMesocycleProgram } from "@/domains/periodization/data/repository";
import type { CoachToolResultPayload } from "@/domains/guidance/agent/contracts";

export const useProposeWorkout = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const workoutHistory = useAppSelector(selectWorkoutHistory);

  return async (): Promise<CoachToolResultPayload> => {
    const userId = user?.id ?? null;
    const weekRange = getCurrentWeekRange();
    const [baseExercises, movementArchetypes, activeProgram, weeklyArchetypeSets] =
      await Promise.all([
        queryClient.ensureQueryData({
          queryKey: ["exercises"],
          queryFn: fetchGuidanceExercises,
          staleTime: Infinity,
        }),
        queryClient.ensureQueryData({
          queryKey: ["movementArchetypes"],
          queryFn: fetchMovementArchetypes,
          staleTime: Infinity,
        }),
        userId
          ? queryClient.ensureQueryData({
              queryKey: ["activeMesocycleProgram", userId],
              queryFn: () => getActiveMesocycleProgram(userId),
              staleTime: 60 * 1000,
            })
          : Promise.resolve(null),
        userId
          ? queryClient.ensureQueryData({
              queryKey: [
                "weeklyArchetypeSets_v2",
                userId,
                weekRange.start,
                weekRange.end,
              ],
              queryFn: () =>
                fetchWeeklyArchetypeSets(userId, weekRange.start, weekRange.end),
              staleTime: 5 * 60 * 1000,
            })
          : Promise.resolve([] as WeeklyArchetypeSetData[]),
      ]);

    const { summary, startWorkoutPayload } = await buildWorkoutPlan({
      baseExercises,
      movementArchetypes,
      planningContext: {
        activeProgram,
        volumeProgress: buildVolumeProgressDisplayData(weeklyArchetypeSets),
      },
      userId,
      workoutHistory,
    });

    return {
      message: summary.message,
      data: { summary },
      artifact: {
        type: "workout_draft",
        title: "Proposed session",
        rationale: summary.message,
        sessionFocus: summary.sessionFocus,
        exercises: summary.selectedExercises.map((name) => ({
          name,
          sets: 3,
        })),
        apply: {
          startWorkoutPayload: startWorkoutPayload as Record<string, unknown>,
        },
      },
    };
  };
};
```

> `buildVolumeProgressDisplayData` is already imported in this file. Reuse it. `sets: 3` is a display placeholder for the draft card; the real per-exercise sets live inside `startWorkoutPayload.initialExercises` and are what `Apply` commits.

- [ ] **Step 3: Replace `generate_strength_workout` with `propose_workout` in `tools.ts`**

Update the `CoachToolContext` and the definition:

```ts
import type { CoachToolResultPayload } from "./contracts.js";

export interface CoachToolContext {
  proposeWorkout: () => Promise<CoachToolResultPayload>;
}
```

Remove the `generate_strength_workout` entry and add:

```ts
  propose_workout: {
    description:
      "Build a draft training session honoring the user's block focus, volume gaps, and any stated constraints (time available, sore area), and render it as a reviewable draft. Does NOT save; the user applies it.",
    execution: "client",
    inputSchema: emptyInputSchema,
    label: "Propose Workout",
    name: "propose_workout",
  },
```

Update `executeCoachTool`'s client branch:

```ts
    case "propose_workout": {
      return context.proposeWorkout();
    }
```

- [ ] **Step 4: Update `runtime.ts` execution map + instructions**

In `coachToolExecutionByName`, replace `generate_strength_workout: "client"` with `propose_workout: "client"`. Update the `generate_strength_workout` tool stub in `createCoachAgentTools` to `propose_workout` (client tools are declared with description + inputSchema only):

```ts
  propose_workout: tool({
    description: coachToolDefinitions.propose_workout.description,
    inputSchema: coachToolDefinitions.propose_workout.inputSchema,
  }),
```

Update the instructions line:

```
- Use `propose_workout` when the user wants a session created or adapted (e.g. limited time, a cranky joint, or "make my next workout"). It returns a draft the user reviews and applies; never claim you saved it.
```

- [ ] **Step 5: Wire `proposeWorkout` into the provider**

In `PresenceAgentProvider.tsx`, replace the Task-3 stub: import and call `useProposeWorkout`, and pass `{ proposeWorkout }` to `executeCoachTool` (both already shown in the Task-3 provider body — remove the temporary stub note).

- [ ] **Step 6: Verify (build + lint, sequential)**

Run: `npm run build` then `npm run lint`.
Expected: **the `generate_strength_workout` errors are now gone**; build succeeds; lint at baseline (8 warnings, 0 errors).

- [ ] **Step 7: Manual check**

With local Supabase running, open the orb and say "I've got 35 minutes and my shoulder's cranky — what should I do?". Coach calls `propose_workout`; a workout draft card renders inline with exercises and an **Apply & start** button. Tapping **Apply & start** closes the sheet, starts the workout, and navigates to `/workout`. Confirm no existing program/workout was edited by the proposal step itself (only Apply creates one).

- [ ] **Step 8: Commit**

```bash
git add src/domains/guidance/hooks/useWorkoutGenerator.ts src/domains/guidance/agent/tools.ts src/domains/guidance/agent/runtime.ts src/domains/guidance/hooks/PresenceAgentProvider.tsx
git commit -m "feat(coach): propose_workout draft artifact with apply-to-create flow"
```

---

### Task 9: Confirm legacy `/coach` still works (regression checkpoint)

**Files:** none (verification only).

`useCoachScreen` still references the old tool context shape. If Step-3 of Task 8 removed `generate_strength_workout` from `tools.ts`, `useCoachScreen.handleSend` (which calls `executeCoachTool(toolCall, { generateWorkout: ... })`) no longer type-checks.

- [ ] **Step 1: Make `useCoachScreen` compile against the new tool context**

The cleanest path, since `/coach` is removed in Task 10, is to point its `executeCoachTool` call at the new context. In `src/domains/guidance/hooks/useCoachScreen.ts`, replace the `generateWorkout: generateWorkoutOnDemand` context with the propose path, or — simpler — delete `useCoachScreen` and `CoachScreen` now if nothing else imports them. Check first:

Run: `grep -rn "useCoachScreen\|CoachScreen" src/ --include=*.ts --include=*.tsx`
- If the only references are `pages/Coach.tsx` → `CoachScreen` → `useCoachScreen`, defer deletion to Task 10 and instead make it compile by swapping the context call to `{ proposeWorkout: ... }` using the same `useProposeWorkout` hook.

- [ ] **Step 2: Verify (build + lint, sequential)**

Run: `npm run build` then `npm run lint`. Expected: clean (baseline).

- [ ] **Step 3: Commit (only if files changed)**

```bash
git add -A
git commit -m "fix(coach): reconcile legacy CoachScreen with new tool context"
```

---

### Task 10: Remove `/coach` (nav item, route, page, FAB)

**Files:**
- Modify: `src/components/layout/navigationItems.ts`
- Modify: `src/components/layout/MainAppLayout.tsx`
- Delete: `src/pages/Coach.tsx` (and `CoachScreen`/`useCoachScreen`/`Chat`/`ChatPrimers` if now unreferenced)

- [ ] **Step 1: Remove the Coach nav item**

In `src/components/layout/navigationItems.ts`, delete the Coach entry and the now-unused `MessageCircle` import:

```ts
export const navigationItems: NavigationItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/workout', label: 'Workout', icon: Dumbbell },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/profile', label: 'Profile', icon: User },
];
```

- [ ] **Step 2: Remove the route and the FAB block in `MainAppLayout.tsx`**

- Delete `<Route path="/coach" element={<Coach />} />` and the `const Coach = lazyWithRetry(...)` import.
- Delete the entire `shouldShowGlobalFab` block and its `const shouldShowGlobalFab = [...]` declaration, plus the now-unused `DropdownMenu`/`Plus` imports **only if** nothing else in the file uses them (grep within the file first).
- Keep `useQuickActions` and the protein/sun/add-exercise dialogs — they are now driven by the surface chips.
- Add a redirect so any lingering `/coach` link lands on home:

```tsx
              <Route path="/coach" element={<Navigate to="/" replace />} />
```

- [ ] **Step 3: Delete dead Coach files**

Run: `grep -rn "pages/Coach\|CoachScreen\|useCoachScreen\|guidance/ui/Chat\|ChatPrimers" src/`
Delete files with no remaining references:

```bash
git rm src/pages/Coach.tsx
# delete CoachScreen.tsx / useCoachScreen.ts / Chat.tsx / ChatPrimers.tsx ONLY if grep shows no importers
```

- [ ] **Step 4: Verify (build + lint, sequential)**

Run: `npm run build` then `npm run lint`. Expected: clean (baseline 8 warnings, 0 errors).

- [ ] **Step 5: Manual check**

The bottom nav shows four tabs (no Coach). Visiting `/coach` redirects to home. No "+" FAB anywhere. The orb is the only agent entry point; all coach functionality (chat, volume chart, workout draft, quick actions) works through the surface.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(presence): remove /coach page, nav item, and global FAB"
```

---

### Task 11: Update CODEMAP + final verification

**Files:**
- Modify: `CODEMAP.md`

- [ ] **Step 1: Update `CODEMAP.md`**

Reflect: the route map (remove `/coach`; note the summon surface is a **global presence**, not a route; `/coach` now redirects to `/`); state ownership (`PresenceAgentProvider` owns coach conversation, ephemeral/fresh-each-launch); guidance domain entrypoints (`SummonSurface`, `ArtifactRenderer`, `artifacts/*`); the Coach agent/runtime boundary (`ScreenContext` read-only payload + `CoachArtifact` contract; tools `get_training_volume`, `propose_workout`; `generate_strength_workout` removed); and that the global "+" quick-action FAB is gone (actions now live as surface chips).

- [ ] **Step 2: Final full verification (build + lint, sequential)**

Run: `npm run build`
Expected: succeeds.
Run: `npm run lint`
Expected: baseline 8 warnings, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add CODEMAP.md
git commit -m "docs(codemap): presence surface, ScreenContext, artifact contract; /coach removed"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** presence orb (T4), bottom-sheet surface (T4–T6), replace `/coach` (T10), screen-context payload (T1–T2), read tools incl. training volume (T7), inline artifacts volume_chart + workout_draft (T6–T8), propose-not-save with Apply→create (T8), quick-action chips from deprecated FAB (T5), fresh-each-launch via context provider (T3), CODEMAP (T11). All spec sections map to a task.
- **No test framework introduced** (AGENTS.md Rule 2); verification is build + lint + manual, matching the repo and the spec.
- **Type consistency:** `ScreenContext`, `CoachArtifact`, `CoachToolResultPayload.artifact`, `buildWorkoutPlan`/`commitWorkoutPlan`/`useProposeWorkout`, and `proposeWorkout` on `CoachToolContext` are defined once and referenced consistently across tasks.
- **Additive ordering:** `/coach` stays working through Task 9 and is removed only in Task 10, so every checkpoint is shippable. The one expected interim breakage (`generate_strength_workout` references) is called out at each checkpoint and resolved in Task 8.
