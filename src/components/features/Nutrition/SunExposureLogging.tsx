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
    if (!hours) {
      toast.error('Please enter the number of hours.');
      return;
    }
    const exposureAmount = parseFloat(hours);
    if (isNaN(exposureAmount) || exposureAmount <= 0) {
      toast.error('Please enter a valid positive number for hours.');
      return;
    }
    mutation.mutate(exposureAmount);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-background p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Log Sun Exposure</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="sunExposureHours" className="block text-sm font-medium text-muted-foreground mb-1">
              Hours of Sun Exposure
            </label>
            <Input
              id="sunExposureHours"
              type="number"
              inputMode="decimal" // Allow decimal for hours
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g., 1.5"
              disabled={mutation.isPending}
            />
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