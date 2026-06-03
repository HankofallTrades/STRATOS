import { useEffect, useRef, useState } from 'react';

import { Input } from '@/components/core/input';
import type { UserFactRow } from '@/domains/account/data/userFactsRepository';
import { cn } from '@/lib/utils/cn';

const SECTION_CLASS = 'stone-surface rounded-[24px] p-5 md:p-6';
const LABEL_CLASS =
  'text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground';

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];
const DAY_ORDER = DAYS.map((d) => d.key);
const DAY_LABEL: Record<string, string> = Object.fromEntries(
  DAYS.map((d) => [d.key, d.label])
);

interface ScheduleDetail {
  days: string[];
  note: string | null;
}

export interface SchedulePayload {
  content: string;
  detail: ScheduleDetail;
}

interface ProfileScheduleSectionProps {
  fact?: UserFactRow;
  isSaving: boolean;
  /** Persist the schedule, or clear it (null) when no days and no note remain. */
  onPersist: (payload: SchedulePayload | null) => void;
}

/** Reads stored days/note, falling back to legacy free-text content as the note. */
const readSchedule = (fact?: UserFactRow): { days: string[]; note: string } => {
  const raw = fact?.detail;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const detail = raw as Partial<ScheduleDetail>;
    return {
      days: Array.isArray(detail.days) ? detail.days : [],
      note: typeof detail.note === 'string' ? detail.note : '',
    };
  }
  return { days: [], note: fact?.content ?? '' };
};

const buildPayload = (days: string[], note: string): SchedulePayload | null => {
  const trimmed = note.trim();
  if (days.length === 0 && !trimmed) return null;
  const content = [days.map((key) => DAY_LABEL[key]).join(', ') || null, trimmed || null]
    .filter(Boolean)
    .join(' · ');
  return { content, detail: { days, note: trimmed || null } };
};

const ProfileScheduleSection = ({
  fact,
  isSaving,
  onPersist,
}: ProfileScheduleSectionProps) => {
  const initial = readSchedule(fact);
  const [days, setDays] = useState<string[]>(initial.days);
  const [note, setNote] = useState<string>(initial.note);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reseed when the underlying fact changes (initial load, cross-device, etc.).
  useEffect(() => {
    const next = readSchedule(fact);
    setDays(next.days);
    setNote(next.note);
  }, [fact]);

  useEffect(
    () => () => {
      if (debounce.current) clearTimeout(debounce.current);
    },
    []
  );

  const persistNow = (nextDays: string[], nextNote: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    onPersist(buildPayload(nextDays, nextNote));
  };

  const persistDebounced = (nextDays: string[], nextNote: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => onPersist(buildPayload(nextDays, nextNote)), 600);
  };

  const toggleDay = (key: string) => {
    const set = new Set(days);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    const next = DAY_ORDER.filter((k) => set.has(k));
    setDays(next);
    persistDebounced(next, note);
  };

  return (
    <section className={SECTION_CLASS}>
      <div className="mb-3 flex items-center justify-between">
        <span className={LABEL_CLASS}>Schedule</span>
        {isSaving ? (
          <span className="text-xs text-muted-foreground/60">Saving…</span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {DAYS.map((day) => {
          const active = days.includes(day.key);
          return (
            <button
              key={day.key}
              type="button"
              aria-pressed={active}
              onClick={() => toggleDay(day.key)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
              )}
            >
              {day.label}
            </button>
          );
        })}
      </div>

      <Input
        value={note}
        placeholder="Add detail (optional) — e.g. ~60 min, mornings"
        className="mt-3 border-0 bg-white/[0.03] rounded-[14px]"
        onChange={(event) => setNote(event.target.value)}
        onBlur={() => persistNow(days, note)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
      />
    </section>
  );
};

export default ProfileScheduleSection;
