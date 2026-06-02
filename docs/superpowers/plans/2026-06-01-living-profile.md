# Living Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a structured, user-editable "model of you" (`user_facts` + two profile fields) surfaced on a new `/profile` screen that replaces Settings in the nav, with the existing Coach able to read the model.

**Architecture:** A new `user_facts` table (RLS, one row per item) owned by the `account` domain via a repository + React Query hook. A new `ProfileScreen` renders facts by category plus body metrics; the existing `SettingsScreen` is nested under `/profile/settings`. The server-side Coach `get_user_profile_summary` tool is extended to include facts + background. Agent *writes* are out of scope (sub-project 2).

**Tech Stack:** React 18 + TypeScript + Vite, Tailwind + shadcn/ui, Redux Toolkit + React Query, Supabase (Postgres + RLS), react-router-dom v6, Vercel AI SDK (Coach runtime).

**Spec:** `docs/superpowers/specs/2026-05-31-living-profile-design.md`

---

## Verification Note (read first)

This repo has **no test runner** (`package.json` has no test script; CODEMAP confirms). Per `AGENTS.md`, verification is:

1. `npm run build`
2. `npm run lint`  (run **sequentially**, never in parallel — Vite writes transient `vite.config.ts.timestamp-*.mjs` files that make ESLint fail with `ENOENT`; expected baseline is 8 warnings, 0 errors)

Do **not** introduce a test framework (Rule 2: nothing speculative). Each task is verified with build + lint + an explicit **manual check**. Local Supabase (Docker) must be running per `README.md` for migration + type-generation steps.

## File Structure

**Create:**
- `supabase/migrations/20260601000001_add_user_facts_and_profile_background.sql` — `user_facts` table + RLS + index; adds `experience_level`, `training_age_years` to `profiles`.
- `src/domains/account/data/userFactsRepository.ts` — types + CRUD for `user_facts`.
- `src/domains/account/hooks/useProfileModel.ts` — React Query for facts + profile, with mutations.
- `src/domains/account/ui/ProfileFactDialog.tsx` — add/edit a single fact (free-text `content`).
- `src/domains/account/ui/ProfileAboutDialog.tsx` — edit body metrics + background fields.
- `src/domains/account/ui/ProfileScreen.tsx` — the living-profile screen.
- `src/pages/Profile.tsx` — thin page wrapper.

**Modify:**
- `src/lib/integrations/supabase/types.ts` — regenerated to include the new table + columns.
- `src/components/layout/navigationItems.ts` — replace Settings nav item with Profile.
- `src/components/layout/MainAppLayout.tsx` — add `/profile` + `/profile/settings` routes, `/settings` redirect, update FAB path list.
- `src/pages/Settings.tsx` — add a "back to Profile" affordance (nested route).
- `src/domains/guidance/agent/runtime.ts` — extend `get_user_profile_summary` to include facts + background.
- `CODEMAP.md` — route map, account domain entries.

**Note on `detail` jsonb:** the `user_facts.detail` column exists in the schema for future structured use (sub-project 2+), but the **v1 UI edits `content` as free text only**. Do not build structured-detail editors now.

---

### Task 1: Migration — `user_facts` table + profile background fields

**Files:**
- Create: `supabase/migrations/20260601000001_add_user_facts_and_profile_background.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Living profile: user_facts table + profile background fields

-- 1. user_facts: one row per "model of you" item
CREATE TABLE public.user_facts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('goal','constraint','schedule','preference','equipment')),
  content TEXT NOT NULL CHECK (length(trim(content)) > 0),
  detail JSONB,
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user','agent')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','dismissed')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON TABLE public.user_facts IS 'Structured, user/agent-authored "model of you" facts the agent reasons over.';
COMMENT ON COLUMN public.user_facts.category IS 'goal | constraint | schedule | preference | equipment.';
COMMENT ON COLUMN public.user_facts.detail IS 'Optional structured payload; unused by v1 UI, reserved for later.';
COMMENT ON COLUMN public.user_facts.source IS 'Internal provenance for agent-write safety; never shown to the user.';
COMMENT ON COLUMN public.user_facts.status IS 'active | pending (reserved for agent proposals) | dismissed.';

ALTER TABLE public.user_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own facts"
  ON public.user_facts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own facts"
  ON public.user_facts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own facts"
  ON public.user_facts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own facts"
  ON public.user_facts FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_user_facts_user_status ON public.user_facts(user_id, status);

-- 2. profiles: training background fields
ALTER TABLE public.profiles
  ADD COLUMN experience_level TEXT CHECK (experience_level IN ('beginner','intermediate','advanced')),
  ADD COLUMN training_age_years NUMERIC;

COMMENT ON COLUMN public.profiles.experience_level IS 'Self-reported training experience level.';
COMMENT ON COLUMN public.profiles.training_age_years IS 'Years of consistent training.';
```

- [ ] **Step 2: Apply migrations locally**

Run: `npm run supabase:reset`
Expected: reset completes, all migrations apply with no error.

- [ ] **Step 3: Verify the table + policies**

Run: `npm run supabase:status` (confirm local stack is up), then in the Supabase Studio SQL editor (or psql) run `select * from public.user_facts limit 1;`
Expected: empty result, no "relation does not exist" error.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260601000001_add_user_facts_and_profile_background.sql
git commit -m "feat(db): add user_facts table and profile background fields"
```

---

### Task 2: Regenerate Supabase types

**Files:**
- Modify: `src/lib/integrations/supabase/types.ts`

- [ ] **Step 1: Regenerate types from the local DB**

Run: `npx supabase gen types typescript --local > src/lib/integrations/supabase/types.ts`
(If the project id is required, use the linked-project form per `README.md`. Local requires the Supabase stack running from Task 1.)

- [ ] **Step 2: Confirm the new types exist**

Run: `grep -n "user_facts" src/lib/integrations/supabase/types.ts`
Expected: matches showing a `user_facts` table with `Row/Insert/Update`. Also confirm `experience_level` and `training_age_years` now appear under `profiles`.

- [ ] **Step 3: Typecheck**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/integrations/supabase/types.ts
git commit -m "chore(types): regenerate supabase types for user_facts + profile background"
```

---

### Task 3: `userFactsRepository` (I/O boundary)

**Files:**
- Create: `src/domains/account/data/userFactsRepository.ts`

- [ ] **Step 1: Write the repository**

```typescript
import { supabase } from '@/lib/integrations/supabase/client';
import type { Database } from '@/lib/integrations/supabase/types';

export type UserFactRow = Database['public']['Tables']['user_facts']['Row'];
export type UserFactCategory =
  | 'goal'
  | 'constraint'
  | 'schedule'
  | 'preference'
  | 'equipment';

export interface CreateUserFactInput {
  category: UserFactCategory;
  content: string;
}

/** Active facts for a user, oldest first. RLS restricts rows to the caller. */
export const listActiveUserFacts = async (userId: string): Promise<UserFactRow[]> => {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('user_facts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to load profile facts: ${error.message}`);
  return (data ?? []) as UserFactRow[];
};

export const createUserFact = async (
  userId: string,
  input: CreateUserFactInput
): Promise<UserFactRow> => {
  if (!userId) throw new Error('createUserFact requires userId');

  const { data, error } = await supabase
    .from('user_facts')
    .insert({
      user_id: userId,
      category: input.category,
      content: input.content.trim(),
      source: 'user',
      status: 'active',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add fact: ${error.message}`);
  return data as UserFactRow;
};

export const updateUserFactContent = async (
  factId: string,
  content: string
): Promise<UserFactRow> => {
  if (!factId) throw new Error('updateUserFactContent requires factId');

  const { data, error } = await supabase
    .from('user_facts')
    .update({ content: content.trim(), updated_at: new Date().toISOString() })
    .eq('id', factId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update fact: ${error.message}`);
  return data as UserFactRow;
};

export const deleteUserFact = async (factId: string): Promise<void> => {
  if (!factId) throw new Error('deleteUserFact requires factId');

  const { error } = await supabase.from('user_facts').delete().eq('id', factId);
  if (error) throw new Error(`Failed to remove fact: ${error.message}`);
};
```

- [ ] **Step 2: Verify**

Run: `npm run build` then `npm run lint`
Expected: build succeeds; lint shows the existing 8-warning baseline, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/domains/account/data/userFactsRepository.ts
git commit -m "feat(account): add user_facts repository"
```

---

### Task 4: `useProfileModel` hook

**Files:**
- Create: `src/domains/account/hooks/useProfileModel.ts`

- [ ] **Step 1: Write the hook**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchUserProfile,
  updateUserProfile,
  type ProfileRow,
  type ProfileUpdateData,
} from '@/domains/account/data/accountRepository';
import {
  createUserFact,
  deleteUserFact,
  listActiveUserFacts,
  updateUserFactContent,
  type CreateUserFactInput,
  type UserFactRow,
} from '@/domains/account/data/userFactsRepository';

const factsKey = (userId: string | null | undefined) => ['user_facts', userId];
const profileKey = (userId: string | null | undefined) => ['profile', userId];

export const useProfileModel = (userId: string | null | undefined) => {
  const queryClient = useQueryClient();

  const factsQuery = useQuery<UserFactRow[]>({
    queryKey: factsKey(userId),
    queryFn: () => (userId ? listActiveUserFacts(userId) : Promise.resolve([])),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const profileQuery = useQuery<ProfileRow | null>({
    queryKey: profileKey(userId),
    queryFn: () => (userId ? fetchUserProfile(userId) : Promise.resolve(null)),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const invalidateFacts = () =>
    queryClient.invalidateQueries({ queryKey: factsKey(userId) });
  const invalidateProfile = () =>
    queryClient.invalidateQueries({ queryKey: profileKey(userId) });

  const createFact = useMutation({
    mutationFn: (input: CreateUserFactInput) => {
      if (!userId) throw new Error('Not authenticated');
      return createUserFact(userId, input);
    },
    onSuccess: invalidateFacts,
  });

  const updateFact = useMutation({
    mutationFn: ({ factId, content }: { factId: string; content: string }) =>
      updateUserFactContent(factId, content),
    onSuccess: invalidateFacts,
  });

  const removeFact = useMutation({
    mutationFn: (factId: string) => deleteUserFact(factId),
    onSuccess: invalidateFacts,
  });

  const updateProfile = useMutation({
    mutationFn: (data: ProfileUpdateData) => {
      if (!userId) throw new Error('Not authenticated');
      return updateUserProfile(userId, data);
    },
    onSuccess: invalidateProfile,
  });

  return {
    facts: factsQuery.data ?? [],
    profile: profileQuery.data ?? null,
    isLoading: factsQuery.isLoading || profileQuery.isLoading,
    error: (factsQuery.error ?? profileQuery.error) as Error | null,
    createFact,
    updateFact,
    removeFact,
    updateProfile,
  };
};
```

- [ ] **Step 2: Verify**

Run: `npm run build` then `npm run lint`
Expected: build succeeds; lint baseline unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/domains/account/hooks/useProfileModel.ts
git commit -m "feat(account): add useProfileModel hook"
```

---

### Task 5: `ProfileFactDialog` (add / edit a fact)

**Files:**
- Create: `src/domains/account/ui/ProfileFactDialog.tsx`

- [ ] **Step 1: Write the dialog**

```tsx
import { useEffect, useState } from 'react';

import { Button } from '@/components/core/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/core/Dialog';
import { Input } from '@/components/core/input';
import { Label } from '@/components/core/label';

interface ProfileFactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryLabel: string;
  /** Existing content when editing; empty string when adding. */
  initialContent?: string;
  isEditing: boolean;
  isSaving: boolean;
  onSubmit: (content: string) => void;
  onDelete?: () => void;
}

export const ProfileFactDialog = ({
  open,
  onOpenChange,
  categoryLabel,
  initialContent = '',
  isEditing,
  isSaving,
  onSubmit,
  onDelete,
}: ProfileFactDialogProps) => {
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    if (open) setContent(initialContent);
  }, [open, initialContent]);

  const trimmed = content.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${categoryLabel}` : `Add ${categoryLabel}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="fact-content">Description</Label>
          <Input
            id="fact-content"
            value={content}
            autoFocus
            placeholder="e.g. Right shoulder — avoid heavy overhead"
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && trimmed) onSubmit(trimmed);
            }}
          />
        </div>
        <DialogFooter className="flex items-center justify-between gap-2">
          {isEditing && onDelete ? (
            <Button variant="ghost" className="text-destructive" onClick={onDelete} disabled={isSaving}>
              Remove
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={() => onSubmit(trimmed)} disabled={!trimmed || isSaving}>
            {isEditing ? 'Save' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileFactDialog;
```

- [ ] **Step 2: Verify**

Run: `npm run build` then `npm run lint`
Expected: build succeeds; lint baseline unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/domains/account/ui/ProfileFactDialog.tsx
git commit -m "feat(account): add ProfileFactDialog"
```

---

### Task 6: `ProfileAboutDialog` (edit body + background)

**Files:**
- Create: `src/domains/account/ui/ProfileAboutDialog.tsx`

- [ ] **Step 1: Write the dialog**

```tsx
import { useEffect, useState } from 'react';

import { Button } from '@/components/core/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/core/Dialog';
import { Input } from '@/components/core/input';
import { Label } from '@/components/core/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/core/select';
import type { ProfileRow, ProfileUpdateData } from '@/domains/account/data/accountRepository';

interface ProfileAboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileRow | null;
  isSaving: boolean;
  onSubmit: (data: ProfileUpdateData) => void;
}

const toNumberOrNull = (value: string): number | null => {
  const n = Number(value);
  return value.trim() === '' || Number.isNaN(n) ? null : n;
};

export const ProfileAboutDialog = ({
  open,
  onOpenChange,
  profile,
  isSaving,
  onSubmit,
}: ProfileAboutDialogProps) => {
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [experience, setExperience] = useState<string>('');
  const [trainingAge, setTrainingAge] = useState('');

  useEffect(() => {
    if (!open) return;
    setAge(profile?.age?.toString() ?? '');
    setHeight(profile?.height?.toString() ?? '');
    setWeight(profile?.weight?.toString() ?? '');
    setExperience(profile?.experience_level ?? '');
    setTrainingAge(profile?.training_age_years?.toString() ?? '');
  }, [open, profile]);

  const handleSave = () => {
    onSubmit({
      age: toNumberOrNull(age),
      height: toNumberOrNull(height),
      weight: toNumberOrNull(weight),
      experience_level: experience === '' ? null : experience,
      training_age_years: toNumberOrNull(trainingAge),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>About you</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="about-age">Age</Label>
            <Input id="about-age" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="about-training-age">Training age (yrs)</Label>
            <Input id="about-training-age" type="number" value={trainingAge} onChange={(e) => setTrainingAge(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="about-height">Height</Label>
            <Input id="about-height" type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="about-weight">Weight</Label>
            <Input id="about-weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div className="space-y-1 col-span-2">
            <Label>Experience</Label>
            <Select value={experience} onValueChange={setExperience}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileAboutDialog;
```

- [ ] **Step 2: Verify**

Run: `npm run build` then `npm run lint`
Expected: build succeeds; lint baseline unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/domains/account/ui/ProfileAboutDialog.tsx
git commit -m "feat(account): add ProfileAboutDialog"
```

---

### Task 7: `ProfileScreen` + `Profile` page

**Files:**
- Create: `src/domains/account/ui/ProfileScreen.tsx`
- Create: `src/pages/Profile.tsx`

- [ ] **Step 1: Write the screen**

```tsx
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Plus, Settings as SettingsIcon } from 'lucide-react';

import { Button } from '@/components/core/button';
import { useAuth } from '@/state/auth/AuthProvider';
import { useProfileModel } from '@/domains/account/hooks/useProfileModel';
import type {
  UserFactCategory,
  UserFactRow,
} from '@/domains/account/data/userFactsRepository';
import ProfileFactDialog from '@/domains/account/ui/ProfileFactDialog';
import ProfileAboutDialog from '@/domains/account/ui/ProfileAboutDialog';

const CATEGORIES: { key: UserFactCategory; label: string }[] = [
  { key: 'goal', label: 'Goals' },
  { key: 'constraint', label: 'Constraints' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'preference', label: 'Preferences' },
  { key: 'equipment', label: 'Equipment' },
];

type FactDialogState =
  | { mode: 'closed' }
  | { mode: 'add'; category: UserFactCategory; label: string }
  | { mode: 'edit'; fact: UserFactRow; label: string };

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;
  const { facts, profile, createFact, updateFact, removeFact, updateProfile } =
    useProfileModel(userId);

  const [factDialog, setFactDialog] = useState<FactDialogState>({ mode: 'closed' });
  const [aboutOpen, setAboutOpen] = useState(false);

  const factsByCategory = useMemo(() => {
    const map: Record<string, UserFactRow[]> = {};
    for (const fact of facts) (map[fact.category] ??= []).push(fact);
    return map;
  }, [facts]);

  const subtitle = [
    profile?.experience_level
      ? profile.experience_level.charAt(0).toUpperCase() + profile.experience_level.slice(1)
      : null,
    profile?.training_age_years ? `~${profile.training_age_years} yrs training` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const isSavingFact =
    createFact.isPending || updateFact.isPending || removeFact.isPending;

  const handleFactSubmit = (content: string) => {
    if (factDialog.mode === 'add') {
      createFact.mutate(
        { category: factDialog.category, content },
        { onSuccess: () => setFactDialog({ mode: 'closed' }) }
      );
    } else if (factDialog.mode === 'edit') {
      updateFact.mutate(
        { factId: factDialog.fact.id, content },
        { onSuccess: () => setFactDialog({ mode: 'closed' }) }
      );
    }
  };

  const handleFactDelete = () => {
    if (factDialog.mode !== 'edit') return;
    removeFact.mutate(factDialog.fact.id, {
      onSuccess: () => setFactDialog({ mode: 'closed' }),
    });
  };

  return (
    <div className="app-page space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 flex-none rounded-full bg-gradient-to-br from-primary/70 to-primary/20" />
        <div className="min-w-0">
          <h1 className="app-page-title">{profile?.username ?? 'Profile'}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Settings"
          className="ml-auto"
          onClick={() => navigate('/profile/settings')}
        >
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </header>

      {CATEGORIES.map(({ key, label }) => (
        <section key={key} className="stone-surface rounded-[24px] p-5 md:p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {label}
            </span>
            <button
              type="button"
              className="text-sm text-primary"
              onClick={() => setFactDialog({ mode: 'add', category: key, label })}
            >
              <Plus className="inline h-3.5 w-3.5" /> add
            </button>
          </div>
          {(factsByCategory[key] ?? []).length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground/70">Nothing yet.</p>
          ) : (
            <ul>
              {(factsByCategory[key] ?? []).map((fact) => (
                <li
                  key={fact.id}
                  className="flex items-center gap-3 border-b border-border/40 py-2.5 last:border-none"
                >
                  <span className="flex-1 text-sm">{fact.content}</span>
                  <button
                    type="button"
                    aria-label="Edit"
                    className="text-muted-foreground/60"
                    onClick={() => setFactDialog({ mode: 'edit', fact, label })}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section className="stone-surface rounded-[24px] p-5 md:p-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Body
          </span>
          <button type="button" className="text-sm text-primary" onClick={() => setAboutOpen(true)}>
            <Pencil className="inline h-3.5 w-3.5" /> edit
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><div className="text-xs text-muted-foreground">Age</div><div className="text-lg font-semibold">{profile?.age ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Height</div><div className="text-lg font-semibold">{profile?.height ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Weight</div><div className="text-lg font-semibold">{profile?.weight ?? '—'}</div></div>
        </div>
      </section>

      <Link to="/analytics" className="flex items-center justify-between border-t border-border/40 pt-4 text-sm text-muted-foreground">
        <span>Trends &amp; progression</span>
        <span className="text-primary">Analytics →</span>
      </Link>

      <ProfileFactDialog
        open={factDialog.mode !== 'closed'}
        onOpenChange={(open) => !open && setFactDialog({ mode: 'closed' })}
        categoryLabel={factDialog.mode === 'closed' ? '' : factDialog.label}
        isEditing={factDialog.mode === 'edit'}
        initialContent={factDialog.mode === 'edit' ? factDialog.fact.content : ''}
        isSaving={isSavingFact}
        onSubmit={handleFactSubmit}
        onDelete={handleFactDelete}
      />
      <ProfileAboutDialog
        open={aboutOpen}
        onOpenChange={setAboutOpen}
        profile={profile}
        isSaving={updateProfile.isPending}
        onSubmit={(data) =>
          updateProfile.mutate(data, { onSuccess: () => setAboutOpen(false) })
        }
      />
    </div>
  );
};

export default ProfileScreen;
```

- [ ] **Step 2: Write the thin page wrapper**

```tsx
import ProfileScreen from "@/domains/account/ui/ProfileScreen";

const Profile = () => {
  return <ProfileScreen />;
};

export default Profile;
```

- [ ] **Step 3: Verify**

Run: `npm run build` then `npm run lint`
Expected: build succeeds; lint baseline unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/domains/account/ui/ProfileScreen.tsx src/pages/Profile.tsx
git commit -m "feat(account): add ProfileScreen and Profile page"
```

---

### Task 8: Routing + nav swap (Settings → Profile)

**Files:**
- Modify: `src/components/layout/navigationItems.ts`
- Modify: `src/components/layout/MainAppLayout.tsx`
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Swap the nav item to Profile**

In `src/components/layout/navigationItems.ts`, replace the `Settings` icon import with `User`, and replace the Settings nav entry. Final import block and array:

```typescript
import {
  BarChart2,
  Dumbbell,
  Home,
  MessageCircle,
  User,
  type LucideIcon,
} from 'lucide-react';
```

```typescript
export const navigationItems: NavigationItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/workout', label: 'Workout', icon: Dumbbell },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/coach', label: 'Coach', icon: MessageCircle },
  { to: '/profile', label: 'Profile', icon: User },
];
```

(Leave `isNavigationItemActive` unchanged — `'/profile'` already matches `'/profile/settings'` via its `startsWith(`${to}/`)` branch.)

- [ ] **Step 2: Add routes + redirect + FAB path update in `MainAppLayout.tsx`**

Add `Navigate` to the router import:

```typescript
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
```

Add a lazy import for the Profile page alongside the others (after the `Settings` lazy line at ~93):

```typescript
const Profile = lazyWithRetry(() => import("@/pages/Profile"));
```

Replace the `shouldShowGlobalFab` path list to use the new routes:

```typescript
  const shouldShowGlobalFab = ![
    "/",
    "/workout",
    "/analytics",
    "/coach",
    "/profile",
    "/profile/settings",
  ].includes(location.pathname);
```

Replace the `<Route path="/settings" ... />` line with the profile routes plus a redirect:

```tsx
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/settings" element={<Settings />} />
              <Route path="/settings" element={<Navigate to="/profile/settings" replace />} />
```

(Keep the existing `Settings` lazy import — it now renders at `/profile/settings`.)

- [ ] **Step 3: Add a back-to-Profile affordance on the nested Settings page**

Rewrite `src/pages/Settings.tsx` so the nested route has a way back (the page wrapper stays thin):

```tsx
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import SettingsScreen from "@/domains/account/ui/SettingsScreen";

const Settings = () => {
  return (
    <div>
      <div className="app-page pb-0">
        <Link to="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Profile
        </Link>
      </div>
      <SettingsScreen />
    </div>
  );
};

export default Settings;
```

- [ ] **Step 4: Verify (build + lint)**

Run: `npm run build` then `npm run lint`
Expected: build succeeds; lint baseline unchanged.

- [ ] **Step 5: Manual check**

Run: `npm run dev`, log in, then verify:
- Bottom nav (mobile width) and side `NavBar` (desktop) show **Profile** instead of Settings; the Profile tab is active on `/profile` and `/profile/settings`.
- `/profile` renders the screen; the gear opens `/profile/settings`; the back link returns to `/profile`.
- Visiting `/settings` redirects to `/profile/settings`.
- All prior Settings actions (units, Coach provider/key, training reset, sign out) still work.
- The global FAB does **not** appear on `/profile` or `/profile/settings`.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/navigationItems.ts src/components/layout/MainAppLayout.tsx src/pages/Settings.tsx
git commit -m "feat(nav): replace Settings nav with Profile; nest Settings under /profile/settings"
```

---

### Task 9: Extend the Coach read tool to include facts + background

**Files:**
- Modify: `src/domains/guidance/agent/runtime.ts`

- [ ] **Step 1: Add a facts formatter helper**

Add this near `formatProfileSummary` (around line 73):

```typescript
const formatProfileFacts = (
  facts: { category: string; content: string }[]
): string => {
  if (facts.length === 0) return "";
  const labels: Record<string, string> = {
    goal: "Goals",
    constraint: "Constraints",
    schedule: "Schedule",
    preference: "Preferences",
    equipment: "Equipment",
  };
  const order = ["goal", "constraint", "schedule", "preference", "equipment"];
  const lines = order
    .map((category) => {
      const items = facts.filter((f) => f.category === category);
      if (items.length === 0) return null;
      return `${labels[category]}: ${items.map((f) => f.content).join("; ")}`;
    })
    .filter(Boolean);
  return lines.length ? `\nUser model — ${lines.join(". ")}.` : "";
};
```

- [ ] **Step 2: Include background columns in the profile select**

In `get_user_profile_summary` (around line 238), change the `.select(...)` string to add the two background columns:

```typescript
        .select(
          "age, focus, height, preferred_distance_unit, preferred_height_unit, preferred_weight_unit, weight, experience_level, training_age_years"
        )
```

- [ ] **Step 3: Query active facts and append them to the summary**

In the same `execute`, after the existing profile `if (!data)` guard and before the final `return`, fetch facts and compose the message. Replace the existing final return:

```typescript
      return createServerToolPayload(formatProfileSummary(data), {
        profile: data,
      });
```

with:

```typescript
      const { data: factRows } = await context.supabase
        .from("user_facts")
        .select("category, content")
        .eq("user_id", context.user.id)
        .eq("status", "active");

      const facts = (factRows ?? []) as { category: string; content: string }[];

      return createServerToolPayload(
        `${formatProfileSummary(data)}${formatProfileFacts(facts)}`,
        { profile: data, facts }
      );
```

(RLS already restricts `user_facts` to the caller; the explicit `user_id` filter is belt-and-suspenders and keeps the query intentional.)

- [ ] **Step 4: Verify (build + lint)**

Run: `npm run build` then `npm run lint`
Expected: build succeeds; lint baseline unchanged.

- [ ] **Step 5: Manual check**

With `npm run dev` + a configured Coach provider: add a goal and a constraint on `/profile`, then ask Coach "what are my goals and constraints?" Expected: the reply reflects the facts you entered (the tool returns them).

- [ ] **Step 6: Commit**

```bash
git add src/domains/guidance/agent/runtime.ts
git commit -m "feat(coach): read user_facts + background in get_user_profile_summary"
```

---

### Task 10: Update CODEMAP + final verification

**Files:**
- Modify: `CODEMAP.md`

- [ ] **Step 1: Update the route map and account domain entries**

In `CODEMAP.md`:
- Under **Route Map**, replace the `/settings` entry with:
  - `/profile` → Page `src/pages/Profile.tsx`, Screen `src/domains/account/ui/ProfileScreen.tsx`, hook `src/domains/account/hooks/useProfileModel.ts`.
  - `/profile/settings` → Page `src/pages/Settings.tsx`, Screen `src/domains/account/ui/SettingsScreen.tsx` (legacy `/settings` redirects here).
- Under **Domain Map → `src/domains/account`**, add `data/userFactsRepository.ts`, `hooks/useProfileModel.ts`, `ui/ProfileScreen.tsx`, `ui/ProfileFactDialog.tsx`, `ui/ProfileAboutDialog.tsx`, and note Profile is now the nav destination with Settings nested.
- Under **Coach runtime**, note `get_user_profile_summary` now also returns active `user_facts` + background fields.
- Under **Backend and Data Contract**, add `user_facts` and the `profiles` background columns to recent feature areas.

- [ ] **Step 2: Final full verification**

Run sequentially:
1. `npm run build`
2. `npm run lint`
Expected: build succeeds; lint shows the 8-warning baseline, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add CODEMAP.md
git commit -m "docs(codemap): living profile route, account domain, coach read tool"
```

---

## Self-Review

**Spec coverage** (against `2026-05-31-living-profile-design.md`):
- `user_facts` table + RLS → Task 1. ✓
- `profiles` background fields → Task 1. ✓
- Categories goal/constraint/schedule/preference/equipment → Task 1 CHECK + Task 7 CATEGORIES. ✓
- Internal-only `source`; no provenance UI → schema in Task 1; ProfileScreen (Task 7) renders no source. ✓
- Derived stays in Analytics → no derived UI built; `Analytics →` link in Task 7. ✓
- Equipment as free-text fact → category in Task 1, free-text content in Task 5/7. ✓
- New `/profile` screen, edit/add/remove, Body section, Analytics link → Tasks 5–7. ✓
- Nav swap + nested `/profile/settings` + `/settings` redirect → Task 8. ✓
- Agent read tool includes facts + background → Task 9. ✓
- CODEMAP updated → Task 10. ✓
- Build + lint baseline preserved → every task. ✓
- Out of scope (agent writes, keep/remove, structured detail UI) → not built. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code. ✓

**Type consistency:** `UserFactRow`, `UserFactCategory`, `CreateUserFactInput` defined in Task 3 and used consistently in Tasks 4/5/7. `useProfileModel` returns `createFact/updateFact/removeFact/updateProfile` (Task 4) used with those exact names in Task 7. `formatProfileFacts` defined and called in Task 9. ✓

## Execution Handoff

See the options offered after this plan is saved.
