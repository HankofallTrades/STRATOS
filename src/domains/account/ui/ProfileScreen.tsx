import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/core/button';
import { useAuth } from '@/state/auth/AuthProvider';
import { useProfileModel } from '@/domains/account/hooks/useProfileModel';
import type {
  UserFactCategory,
  UserFactRow,
} from '@/domains/account/data/userFactsRepository';
import ProfileFactDialog from '@/domains/account/ui/ProfileFactDialog';
import ProfileAboutDialog from '@/domains/account/ui/ProfileAboutDialog';
import ProfileScheduleSection, {
  type SchedulePayload,
} from '@/domains/account/ui/ProfileScheduleSection';

const CATEGORIES: { key: UserFactCategory; label: string }[] = [
  { key: 'goal', label: 'Goals' },
  { key: 'constraint', label: 'Constraints' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'preference', label: 'Preferences' },
  { key: 'equipment', label: 'Equipment' },
];

const CATEGORY_PLACEHOLDERS: Record<UserFactCategory, string> = {
  goal: 'e.g. Squat 140 kg by December',
  constraint: 'e.g. Right shoulder — avoid heavy overhead',
  schedule: 'e.g. Train Mon / Wed / Fri, ~60 min',
  preference: 'e.g. Prefer free weights over machines',
  equipment: 'e.g. Home gym — barbell, rack, dumbbells',
};

const SECTION_CLASS = "stone-surface rounded-[24px] p-5 md:p-6";
const LABEL_CLASS = "text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground";

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
        {
          onSuccess: () => setFactDialog({ mode: 'closed' }),
          onError: () => toast.error('Failed to save. Please try again.'),
        }
      );
    } else if (factDialog.mode === 'edit') {
      updateFact.mutate(
        { factId: factDialog.fact.id, content },
        {
          onSuccess: () => setFactDialog({ mode: 'closed' }),
          onError: () => toast.error('Failed to save. Please try again.'),
        }
      );
    }
  };

  const handleFactDelete = () => {
    if (factDialog.mode !== 'edit') return;
    removeFact.mutate(factDialog.fact.id, {
      onSuccess: () => setFactDialog({ mode: 'closed' }),
      onError: () => toast.error('Failed to remove. Please try again.'),
    });
  };

  const handleSchedulePersist = (payload: SchedulePayload | null) => {
    const existing = factsByCategory['schedule']?.[0];
    const onError = () => toast.error('Failed to save schedule. Please try again.');
    if (!payload) {
      if (existing) removeFact.mutate(existing.id, { onError });
      return;
    }
    if (existing) {
      updateFact.mutate(
        { factId: existing.id, content: payload.content, detail: payload.detail },
        { onError }
      );
    } else if (!createFact.isPending) {
      createFact.mutate(
        { category: 'schedule', content: payload.content, detail: payload.detail },
        { onError }
      );
    }
  };

  return (
    <div className="app-page space-y-6">
      <header className="flex items-center gap-3">
        <div className="app-accent-emblem flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-semibold uppercase">
          {(profile?.username ?? '?').charAt(0)}
        </div>
        <div className="min-w-0">
          <h1 className="app-page-title">{profile?.username ?? 'Profile'}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          className="ml-auto"
          onClick={() => navigate('/profile/settings')}
        >
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </header>

      {CATEGORIES.map(({ key, label }) => {
        if (key === 'schedule') {
          return (
            <ProfileScheduleSection
              key={key}
              fact={factsByCategory['schedule']?.[0]}
              isSaving={isSavingFact}
              onPersist={handleSchedulePersist}
            />
          );
        }
        return (
        <section key={key} className={SECTION_CLASS}>
          <div className="mb-2 flex items-center justify-between">
            <span className={LABEL_CLASS}>
              {label}
            </span>
            <button
              type="button"
              aria-label={`Add ${label}`}
              className="app-accent-text text-sm transition-colors hover:text-[#dff3ec]"
              onClick={() => setFactDialog({ mode: 'add', category: key, label })}
            >
              <Plus aria-hidden className="inline h-3.5 w-3.5" /> add
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
                    <Pencil aria-hidden className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        );
      })}

      <section className={SECTION_CLASS}>
        <div className="mb-2 flex items-center justify-between">
          <span className={LABEL_CLASS}>
            Body
          </span>
          <button type="button" aria-label="Edit body metrics" className="app-accent-text text-sm transition-colors hover:text-[#dff3ec]" onClick={() => setAboutOpen(true)}>
            <Pencil aria-hidden className="inline h-3.5 w-3.5" /> edit
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><div className="text-xs text-muted-foreground">Age</div><div className="text-lg font-semibold">{profile?.age ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Height</div><div className="text-lg font-semibold">{profile?.height ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Weight</div><div className="text-lg font-semibold">{profile?.weight ?? '—'}</div></div>
        </div>
      </section>

      <ProfileFactDialog
        open={factDialog.mode !== 'closed'}
        onOpenChange={(open) => !open && setFactDialog({ mode: 'closed' })}
        categoryLabel={factDialog.mode === 'closed' ? '' : factDialog.label}
        placeholder={
          factDialog.mode === 'add'
            ? CATEGORY_PLACEHOLDERS[factDialog.category]
            : factDialog.mode === 'edit'
              ? CATEGORY_PLACEHOLDERS[factDialog.fact.category as UserFactCategory]
              : undefined
        }
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
          updateProfile.mutate(data, {
            onSuccess: () => setAboutOpen(false),
            onError: () => toast.error('Failed to save. Please try again.'),
          })
        }
      />
    </div>
  );
};

export default ProfileScreen;
