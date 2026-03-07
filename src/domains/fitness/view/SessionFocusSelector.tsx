import React from 'react';
import { SessionFocus } from '@/lib/types/workout';
import { Heart, Zap, Dumbbell, Flame, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface SessionFocusSelectorProps {
  onSelectFocus: (focus: SessionFocus) => void;
  selectedFocus?: SessionFocus | null;
  compact?: boolean;
  label?: string;
  helperText?: string;
}

interface FocusOption {
  focus: SessionFocus;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const focusOptions: FocusOption[] = [
  {
    focus: 'strength',
    title: 'Strength',
    description: 'Heavy lifting, low reps, high load',
    icon: <Dumbbell className="h-4 w-4" />,
  },
  {
    focus: 'hypertrophy',
    title: 'Hypertrophy',
    description: 'Muscle building with moderate volume',
    icon: <Flame className="h-4 w-4" />,
  },
  {
    focus: 'zone2',
    title: 'Endurance',
    description: 'Steady aerobic base work',
    icon: <Heart className="h-4 w-4" />,
  },
  {
    focus: 'zone5',
    title: 'Max HR',
    description: 'High-intensity VO2 max effort',
    icon: <Zap className="h-4 w-4" />,
  },
  {
    focus: 'speed',
    title: 'Speed & Power',
    description: 'Explosive movement emphasis',
    icon: <Zap className="h-4 w-4" />,
  },
  {
    focus: 'recovery',
    title: 'Recovery',
    description: 'Light movement and restoration',
    icon: <Heart className="h-4 w-4" />,
  },
  {
    focus: 'mixed',
    title: 'Mixed',
    description: 'Blend strength, volume, and conditioning',
    icon: <BarChart3 className="h-4 w-4" />,
  },
];

const SessionFocusSelector: React.FC<SessionFocusSelectorProps> = ({
  onSelectFocus,
  selectedFocus = null,
  compact = false,
  label,
  helperText,
}) => {
  const currentSelection = selectedFocus;

  if (compact) {
    return (
      <div className="space-y-3">
        {label || helperText ? (
          <div className="space-y-1">
            {label ? (
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {label}
              </h3>
            ) : null}
            {helperText ? <p className="text-sm text-muted-foreground">{helperText}</p> : null}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {focusOptions.map(option => {
            const isSelected = currentSelection === option.focus;
            return (
              <button
                key={option.focus}
                type="button"
                onClick={() => onSelectFocus(option.focus)}
                aria-pressed={isSelected}
                className={cn(
                  'flex min-h-[3.5rem] items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left transition-colors duration-150',
                  isSelected
                    ? 'border-[rgba(var(--stone-accent-rgb),0.26)] bg-[rgba(var(--stone-accent-rgb),0.08)] text-foreground'
                    : 'border-white/[0.06] bg-transparent text-foreground/84 hover:bg-white/[0.03] hover:text-foreground'
                )}
              >
                <div className={cn('shrink-0', isSelected ? 'verdigris-text' : 'text-muted-foreground')}>
                  {option.icon}
                </div>
                <div className="min-w-0 text-sm font-medium leading-tight">
                  {option.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section className="stone-surface rounded-[26px] p-5 md:p-6">
      {label || helperText ? (
        <div className="mb-4 space-y-1">
          {label ? (
            <h3 className="text-2xl font-semibold tracking-tight text-foreground">
              {label}
            </h3>
          ) : null}
          {helperText ? <p className="text-sm text-muted-foreground">{helperText}</p> : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {focusOptions.map(option => {
          const isSelected = currentSelection === option.focus;
          return (
            <button
              key={option.focus}
              type="button"
              onClick={() => onSelectFocus(option.focus)}
              aria-pressed={isSelected}
              className={cn(
                'flex items-start gap-3 rounded-[16px] border px-4 py-4 text-left transition-colors duration-150',
                isSelected
                  ? 'border-[rgba(var(--stone-accent-rgb),0.26)] bg-[rgba(var(--stone-accent-rgb),0.08)]'
                  : 'border-white/[0.06] bg-transparent hover:bg-white/[0.03]'
              )}
            >
              <div className={cn('mt-0.5 shrink-0', isSelected ? 'verdigris-text' : 'text-muted-foreground')}>
                {option.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground">{option.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default SessionFocusSelector;
