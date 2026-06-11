import React, { useState } from 'react';
import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';
import { useSunExposure } from '../hooks/useSunExposure';

interface SunExposureLoggingProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

const SunExposureLogging: React.FC<SunExposureLoggingProps> = ({ isOpen, onClose, userId }) => {
  const [hours, setHours] = useState<string>('');
  const [minutes, setMinutes] = useState<string>('');
  const { logSun, isLogging } = useSunExposure(userId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await logSun(hours, minutes);
    if (success) {
      setHours('');
      setMinutes('');
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="stone-panel w-full max-w-md rounded-[24px] border-white/10 p-6 motion-safe:animate-fade-rise">
        <h2 className="mb-5 text-xl font-semibold tracking-tight text-foreground">Log Sun Exposure</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label
                htmlFor="sunExposureHoursInput"
                className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground"
              >
                Hours
              </label>
              <Input
                id="sunExposureHoursInput"
                type="number"
                inputMode="numeric"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="e.g. 1"
                min="0"
                disabled={isLogging}
                className="app-form-input stone-inset h-11 rounded-[16px] border-0 px-3 text-sm tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="sunExposureMinutesInput"
                className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground"
              >
                Minutes
              </label>
              <Input
                id="sunExposureMinutesInput"
                type="number"
                inputMode="numeric"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="e.g. 30"
                min="0"
                max="59"
                disabled={isLogging}
                className="app-form-input stone-inset h-11 rounded-[16px] border-0 px-3 text-sm tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLogging}
              className="app-tonal-control h-10 rounded-[16px] px-4 text-sm font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLogging}
              className="app-primary-action h-10 rounded-[16px] px-5 text-sm font-semibold"
            >
              {isLogging ? 'Logging...' : 'Log'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SunExposureLogging; 