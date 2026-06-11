# Craft & Performance Pass (Sub-project 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Motion tokens applied to flagship moments, the 648 kB entry-chunk warning resolved via vendor `manualChunks`, and the four spinner sites converted to a vendored unicode glyph spinner.

**Architecture:** CSS-first motion (Tailwind keyframes + `motion-safe:` variant; framer-motion stays confined to the workout interaction path). Bundle splitting via a `manualChunks` function in `vite.config.ts` covering only eagerly-loaded vendors (framer-motion and recharts stay naturally lazy). `UnicodeSpinner` in `components/core` with frames vendored from `sindresorhus/cli-spinners` (MIT).

**Spec:** `docs/superpowers/specs/2026-06-11-craft-performance-design.md`

## Verification rules (every task)

Sequential `npm run build` then `npm run lint`. Baseline: 0 errors; 8 unique react-refresh warnings (double-reported as 16). Record chunk sizes before/after in Task 2.

---

### Task 1: Motion tokens (`tailwind.config.ts`)

- [ ] **Step 1:** Add to `theme.extend.keyframes`:

```ts
				'fade-rise': {
					from: { opacity: '0', transform: 'translateY(6px)' },
					to: { opacity: '1', transform: 'translateY(0)' },
				},
				'set-confirm': {
					'0%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(1.3)' },
					'100%': { transform: 'scale(1)' },
				},
```

And to `theme.extend.animation`:

```ts
				'fade-rise': 'fade-rise 220ms cubic-bezier(0.2, 0, 0, 1) both',
				'set-confirm': 'set-confirm 200ms cubic-bezier(0.2, 0, 0, 1)',
```

Usage convention everywhere: `motion-safe:animate-fade-rise` / `motion-safe:animate-set-confirm` so `prefers-reduced-motion` disables them with no extra code.

- [ ] **Step 2:** Verify (build, lint) and commit: `git add tailwind.config.ts && git commit -m "feat(craft): motion tokens — fade-rise + set-confirm keyframes"`

---

### Task 2: Vendor chunk split (`vite.config.ts`)

- [ ] **Step 1:** Record before sizes (`npm run build` → entry `index` ≈ 647.94 kB warning, `ProtectedAppShell` ≈ 177 kB).

- [ ] **Step 2:** Add to the returned config object:

```ts
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
            return "react-vendor";
          }
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@radix-ui")) return "radix";
          if (/node_modules\/(@reduxjs|react-redux|redux-persist|redux|@tanstack)\//.test(id)) {
            return "state";
          }
          return undefined;
        },
      },
    },
  },
```

Do NOT include framer-motion or recharts — they are only referenced by lazy modules and must stay naturally lazy.

- [ ] **Step 3:** Build; confirm: no chunk-size warning, every chunk < 500 kB, and the lazy chunks (recharts/`SwipeableIncrementer`) still exist as separate files. If any single chunk still exceeds 500 kB, stop and report rather than raising the limit.

- [ ] **Step 4:** Lint, then commit: `git add vite.config.ts && git commit -m "perf(build): vendor manualChunks — resolve entry chunk-size warning"`

---

### Task 3: `UnicodeSpinner` + spinner replacements

**Files:** Create `src/components/core/UnicodeSpinner.tsx`; modify `VariationSelector.tsx`, `AddSingleExerciseDialog.tsx`, `RecentWorkouts.tsx`, `WorkoutExerciseView.tsx`.

- [ ] **Step 1:** Write the component:

```tsx
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils/cn";

// Frames vendored from sindresorhus/cli-spinners (MIT).
const SPINNERS = {
  dots: {
    interval: 80,
    frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  },
  aesthetic: {
    interval: 80,
    frames: [
      "▰▱▱▱▱▱▱",
      "▰▰▱▱▱▱▱",
      "▰▰▰▱▱▱▱",
      "▰▰▰▰▱▱▱",
      "▰▰▰▰▰▱▱",
      "▰▰▰▰▰▰▱",
      "▰▰▰▰▰▰▰",
      "▰▱▱▱▱▱▱",
    ],
  },
  moon: {
    interval: 80,
    frames: ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"],
  },
} as const;

interface UnicodeSpinnerProps {
  variant?: keyof typeof SPINNERS;
  className?: string;
  label?: string;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const UnicodeSpinner = ({
  variant = "dots",
  className,
  label = "Loading",
}: UnicodeSpinnerProps) => {
  const { frames, interval } = SPINNERS[variant];
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const timer = window.setInterval(
      () => setFrameIndex((index) => (index + 1) % frames.length),
      interval
    );
    return () => window.clearInterval(timer);
  }, [frames.length, interval]);

  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-block font-mono leading-none", className)}
    >
      {frames[frameIndex]}
    </span>
  );
};

export default UnicodeSpinner;
```

- [ ] **Step 2:** Replace the four sites (import `UnicodeSpinner` in each; drop `Loader2` from the lucide import when unused):

- `VariationSelector.tsx:44`: `{isLoading ? <UnicodeSpinner className="text-[13px]" /> : <ChevronDown … />}`
- `AddSingleExerciseDialog.tsx:107`: `<div className="h-9 flex items-center justify-center"><UnicodeSpinner className="text-base" /></div>`
- `AddSingleExerciseDialog.tsx:303`: `{isSubmitting && <UnicodeSpinner className="mr-2 text-sm" />}`
- `RecentWorkouts.tsx:137`: `<UnicodeSpinner className="text-2xl app-accent-text" />` (keep the adjacent text)
- `WorkoutExerciseView.tsx:698`: `{isSavingVariation ? <UnicodeSpinner className="text-sm" /> : <Check size={16} />}`

- [ ] **Step 3:** Verify (build, lint), commit: `git add src/components/core/UnicodeSpinner.tsx src/domains && git commit -m "feat(craft): UnicodeSpinner (cli-spinners frames) replaces graphic spinners"`

---

### Task 4: Flagship motion moments

**Files:** `PresencePeek.tsx`, `SummonSurface.tsx`, `HomeDashboard.tsx`, `AnalyticsScreen.tsx`, `SetComponent.tsx`.

- [ ] **Step 1: PresencePeek** — replace `animate-in fade-in slide-in-from-bottom-2` with `motion-safe:animate-fade-rise` on the chip container.

- [ ] **Step 2: SummonSurface** — add `motion-safe:animate-fade-rise` to the three conversation row wrappers (user bubble row, assistant/error row, artifact row). Rows animate once on mount; no stagger needed since messages arrive sequentially.

- [ ] **Step 3: HomeDashboard** — wrap the hero card and the cards grid with `motion-safe:animate-fade-rise` plus inline `style={{ animationDelay }}` stagger (0 ms hero, 60 ms grid, 120 ms for any third section). Guard against re-animation on navigation back with a module-level flag:

```tsx
let hasAnimatedHomeEntrance = false;
// in the component:
const [animateEntrance] = useState(() => !hasAnimatedHomeEntrance);
useEffect(() => {
  hasAnimatedHomeEntrance = true;
}, []);
// apply `motion-safe:animate-fade-rise` + delays only when animateEntrance
```

- [ ] **Step 4: AnalyticsScreen** — add `motion-safe:animate-fade-rise` (with the same 0/60/120 ms delay convention) to the top-level section wrappers (performance overview, benchmarks, volume, recent workouts). No flag needed if sections mount once per visit; match Home's flag approach only if re-animation on tab return proves jarring.

- [ ] **Step 5: SetComponent** — transient confirm pulse on completion press for both row variants (cardio ~line 238, strength ~line 360):

```tsx
const [justCompleted, setJustCompleted] = useState(false);
// in the completion button onClick, when marking complete (not un-complete):
if (!isCompleted) {
  setJustCompleted(true);
  window.setTimeout(() => setJustCompleted(false), 250);
}
// on the Check icon / button:
className={cn(..., justCompleted && "motion-safe:animate-set-confirm")}
```

- [ ] **Step 6:** Verify (build, lint), commit: `git add src/domains src/components && git commit -m "feat(craft): fade-rise entrances + set-confirm pulse on flagship surfaces"`

---

### Task 5: CODEMAP + final verification

- [ ] **Step 1:** CODEMAP updates: baseline (chunk-size warning resolved; vendor `manualChunks` in `vite.config.ts`; bundle-size "known debt" entry updated), `components/core/UnicodeSpinner.tsx` note, motion-token convention (`motion-safe:animate-fade-rise` / `animate-set-confirm` in `tailwind.config.ts`; CSS-first, framer-motion confined to workout interactions).
- [ ] **Step 2:** Final `npm run build` (no chunk warning) then `npm run lint` (baseline).
- [ ] **Step 3:** Manual checks: all four surfaces render and animate on first mount; login path unchanged; spinners show braille animation; OS reduced-motion stills everything.
- [ ] **Step 4:** Commit: `git add CODEMAP.md && git commit -m "docs(codemap): craft pass — motion tokens, vendor chunks, UnicodeSpinner"`
