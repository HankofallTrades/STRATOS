import React, { useState } from 'react';
// import { useAuth } from '@/state/auth/authSlice'; // Removed as we couldn't locate it
import { addProteinIntake } from '@/lib/integrations/supabase/nutrition';
import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';
import { toast } from 'sonner';

interface ProteinLoggingProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null; // Added userId prop
}

const ProteinLogging: React.FC<ProteinLoggingProps> = ({ isOpen, onClose, userId }) => {
  // const { user } = useAuth(); // Removed
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { // Check userId prop
      toast.error('User not identified. Please try again.');
      return;
    }
    if (!amount) {
      toast.error('Please enter an amount.');
      return;
    }

    const amountGrams = parseInt(amount, 10);
    if (isNaN(amountGrams) || amountGrams <= 0) {
      toast.error('Please enter a valid positive number for grams.');
      return;
    }

    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      await addProteinIntake(userId, amountGrams, today); // Use userId prop
      toast.success('Protein logged successfully!');
      setAmount('');
      onClose();
    } catch (error) {
      console.error('Failed to log protein:', error);
      toast.error('Failed to log protein. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-background p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Log Protein Intake</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="proteinAmount" className="block text-sm font-medium text-muted-foreground mb-1">
              Protein Amount (grams)
            </label>
            <Input
              id="proteinAmount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 30"
              disabled={isLoading}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Logging...' : 'Log Protein'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProteinLogging; 