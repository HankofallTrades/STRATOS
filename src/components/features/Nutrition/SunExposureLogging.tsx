import React, { useState } from 'react';
import { addSunExposure } from '@/lib/integrations/supabase/wellbeing'; // Adjusted path
import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface SunExposureLoggingProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

const SunExposureLogging: React.FC<SunExposureLoggingProps> = ({ isOpen, onClose, userId }) => {
  const [hours, setHours] = useState<string>('');
  const [minutes, setMinutes] = useState<string>('');
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split('T')[0];

  const mutation = useMutation({
    mutationFn: async (exposureHours: number) => {
      if (!userId) throw new Error('User not identified.');
      // Placeholder for the actual Supabase call
      await addSunExposure(userId, exposureHours, today);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailySunExposure', userId, today] });
      toast.success('Sun exposure logged successfully!');
      setHours('');
      setMinutes('');
      onClose();
    },
    onError: (error: any) => {
      console.error('Failed to log sun exposure:', error);
      toast.error('Failed to log sun exposure. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error('User not identified. Please try again.');
      return;
    }

    const parsedHours = hours ? parseInt(hours, 10) : 0;
    const parsedMinutes = minutes ? parseInt(minutes, 10) : 0;

    if (isNaN(parsedHours) || parsedHours < 0) {
      toast.error('Please enter a valid non-negative number for hours.');
      return;
    }
    if (isNaN(parsedMinutes) || parsedMinutes < 0 || parsedMinutes > 59) {
      toast.error('Please enter a valid number of minutes (0-59).');
      return;
    }
    if (parsedHours === 0 && parsedMinutes === 0) {
      toast.error('Please enter some sun exposure time.');
      return;
    }

    const totalExposureHours = parsedHours + (parsedMinutes / 60);
    
    mutation.mutate(totalExposureHours);
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
                disabled={mutation.isPending}
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
                disabled={mutation.isPending}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Logging...' : 'Log Sun Exposure'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SunExposureLogging; 