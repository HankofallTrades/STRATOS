import React, { useState } from 'react';
import { SessionFocus } from '@/lib/types/workout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/core/card';
import { Button } from '@/components/core/button';
import { Badge } from '@/components/core/badge';
import { Heart, Zap, Dumbbell, Flame } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface SessionFocusSelectorProps {
  onSelectFocus: (focus: SessionFocus) => void;
  selectedFocus?: SessionFocus | null;
  compact?: boolean;
}

interface FocusOption {
  focus: SessionFocus;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  repRange?: string;
  heartRateZone?: string;
}

const focusOptions: FocusOption[] = [
  {
    focus: 'strength',
    title: 'Strength',
    description: 'Heavy lifting, low reps, high weight',
    icon: <Dumbbell className="h-5 w-5" />,
    color: 'bg-red-500',
    repRange: '1-5 reps',
  },
  {
    focus: 'hypertrophy',
    title: 'Hypertrophy',
    description: 'Muscle building, moderate volume',
    icon: <Flame className="h-5 w-5" />,
    color: 'bg-orange-500',
    repRange: '6-12 reps',
  },
  {
    focus: 'zone2',
    title: 'Endurance',
    description: 'Aerobic base building, steady state',
    icon: <Heart className="h-5 w-5" />,
    color: 'bg-green-500',
    heartRateZone: 'Zone 2 (60-70%)',
  },
  {
    focus: 'zone5',
    title: 'Max HR',
    description: 'High intensity, VO2 max work',
    icon: <Zap className="h-5 w-5" />,
    color: 'bg-purple-500',
    heartRateZone: 'Zone 5 (90-100%)',
  },
  {
    focus: 'speed',
    title: 'Speed & Power',
    description: 'Explosive movements, power development',
    icon: <Zap className="h-5 w-5" />,
    color: 'bg-yellow-500',
    repRange: '1-3 reps',
  },
  {
    focus: 'recovery',
    title: 'Recovery',
    description: 'Active recovery, mobility, light movement',
    icon: <Heart className="h-5 w-5" />,
    color: 'bg-blue-500',
    heartRateZone: 'Zone 1 (50-60%)',
  },
];

const SessionFocusSelector: React.FC<SessionFocusSelectorProps> = ({
  onSelectFocus,
  selectedFocus = null,
  compact = false,
}) => {
  const [localSelectedFocus, setLocalSelectedFocus] = useState<SessionFocus | null>(selectedFocus);

  const handleFocusSelect = (option: FocusOption) => {
    setLocalSelectedFocus(option.focus);
    onSelectFocus(option.focus);
  };

  const currentSelection = localSelectedFocus || selectedFocus;

  if (compact) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Choose Training Focus (Optional)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {focusOptions.map((option) => (
            <button
              key={option.focus}
              onClick={() => handleFocusSelect(option)}
              className={cn(
                "p-3 rounded-lg border text-left transition-all hover:shadow-sm",
                currentSelection === option.focus
                  ? "border-fitnessBlue bg-blue-50 dark:bg-blue-950"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              )}
            >
              <div className="flex items-center space-x-2">
                <div className={cn("p-1.5 rounded-full text-white", option.color)}>
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-xs truncate">{option.title}</h4>
                  <div className="mt-1">
                    {option.repRange && (
                      <Badge variant="secondary" className="text-xs">
                        {option.repRange}
                      </Badge>
                    )}
                    {option.heartRateZone && (
                      <Badge variant="secondary" className="text-xs">
                        {option.heartRateZone}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
        {currentSelection && (
          <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
            Selected: {focusOptions.find(opt => opt.focus === currentSelection)?.title}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Choose Your Training Focus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {focusOptions.map((option) => (
              <button
                key={option.focus}
                onClick={() => handleFocusSelect(option)}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-all hover:shadow-md",
                  currentSelection === option.focus
                    ? "border-fitnessBlue bg-blue-50 dark:bg-blue-950"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                )}
              >
                <div className="flex items-start space-x-3">
                  <div className={cn("p-2 rounded-full text-white", option.color)}>
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{option.title}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {option.description}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {option.repRange && (
                        <Badge variant="secondary" className="text-xs">
                          {option.repRange}
                        </Badge>
                      )}
                      {option.heartRateZone && (
                        <Badge variant="secondary" className="text-xs">
                          {option.heartRateZone}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionFocusSelector; 