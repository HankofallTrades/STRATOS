import React, { useState } from 'react';
import { Button } from '@/components/core/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/core/Dialog';
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

  return (
    <Dialog open={isOpen} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Sun Exposure</DialogTitle>
          <DialogDescription>
            Capture your outdoor time without breaking the current flow.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="sunExposureHoursInput" className="block text-sm font-medium text-muted-foreground">
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
            <div className="space-y-1.5">
              <label htmlFor="sunExposureMinutesInput" className="block text-sm font-medium text-muted-foreground">
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
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLogging}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLogging}>
              {isLogging ? 'Logging...' : 'Log Sun Exposure'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SunExposureLogging; 
