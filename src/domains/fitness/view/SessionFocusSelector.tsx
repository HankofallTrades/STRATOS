import React from 'react';
import { SessionFocus } from '@/lib/types/workout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/core/card';
import { Heart, Zap, Dumbbell, Flame, Check } from 'lucide-react';
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
  detail: string;
  icon: React.ReactNode;
}

const focusOptions: FocusOption[] = [
  {
    focus: 'strength',
    title: 'Strength',
    description: 'Heavy lifting, low reps, high load',
    detail: '1-5 reps',
    icon: <Dumbbell className="h-4 w-4" />,
  },
  {
    focus: 'hypertrophy',
    title: 'Hypertrophy',
    description: 'Muscle building with moderate volume',
    detail: '6-12 reps',
    icon: <Flame className="h-4 w-4" />,
  },
  {
    focus: 'zone2',
    title: 'Endurance',
    description: 'Steady aerobic base work',
    detail: 'Zone 2 (60-70%)',
    icon: <Heart className="h-4 w-4" />,
  },
  {
    focus: 'zone5',
    title: 'Max HR',
    description: 'High-intensity VO2 max effort',
    detail: 'Zone 5 (90-100%)',
    icon: <Zap className="h-4 w-4" />,
  },
  {
    focus: 'speed',
    title: 'Speed & Power',
    description: 'Explosive movement emphasis',
    detail: '1-3 reps',
    icon: <Zap className="h-4 w-4" />,
  },
  {
    focus: 'recovery',
    title: 'Recovery',
    description: 'Light movement and restoration',
    detail: 'Zone 1 (50-60%)',
    icon: <Heart className="h-4 w-4" />,
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
      <div className="space-y-2">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-foreground">{label ?? 'Choose Training Focus'}</h3>
          {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {focusOptions.map(option => {
            const isSelected = currentSelection === option.focus;
            return (
              <button
                key={option.focus}
                type="button"
                onClick={() => onSelectFocus(option.focus)}
                aria-pressed={isSelected}
                className={cn(
                  'p-3 rounded-lg border text-left transition-all duration-150 flex items-start justify-between gap-2',
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
                    : 'border-border bg-background hover:border-primary/40 hover:bg-muted/30'
                )}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <div className={cn(
                    'mt-0.5 p-1.5 rounded-full',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    {option.icon}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs truncate">{option.title}</h4>
                    <p className="text-[11px] text-muted-foreground truncate">{option.detail}</p>
                  </div>
                </div>
                <Check className={cn('h-4 w-4 mt-0.5 transition-opacity', isSelected ? 'opacity-100 text-primary' : 'opacity-0')} />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">{label ?? 'Choose Your Training Focus'}</CardTitle>
          {helperText ? <p className="text-sm text-muted-foreground text-center">{helperText}</p> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {focusOptions.map(option => {
              const isSelected = currentSelection === option.focus;
              return (
                <button
                  key={option.focus}
                  type="button"
                  onClick={() => onSelectFocus(option.focus)}
                  aria-pressed={isSelected}
                  className={cn(
                    'p-4 rounded-lg border text-left transition-all duration-150',
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/25'
                      : 'border-border bg-background hover:border-primary/40 hover:bg-muted/30'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'p-2 rounded-full',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}>
                      {option.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm">{option.title}</h3>
                        <Check className={cn('h-4 w-4 transition-opacity', isSelected ? 'opacity-100 text-primary' : 'opacity-0')} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{option.detail}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionFocusSelector;
