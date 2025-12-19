import React, { useState } from 'react';
import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';
import { useSunExposure } from '../controller/useSunExposure';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-background p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Log Sun Exposure</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="sunExposureHoursInput" className="block text-sm font-medium text-muted-foreground mb-1">
                Hours
              </label>
              <Input
                id="sunExposureHoursInput"
                type="number"
                inputMode="numeric"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="e.g., 1"
                min="0"
                disabled={isLogging}
              />
            </div>
            <div>
              <label htmlFor="sunExposureMinutesInput" className="block text-sm font-medium text-muted-foreground mb-1">
                Minutes
              </label>
              <Input
                id="sunExposureMinutesInput"
                type="number"
                inputMode="numeric"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="e.g., 30"
                min="0"
                max="59"
                disabled={isLogging}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLogging}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLogging}>
              {isLogging ? 'Logging...' : 'Log Sun Exposure'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SunExposureLogging; 