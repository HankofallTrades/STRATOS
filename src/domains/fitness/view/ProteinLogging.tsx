import React, { useState } from 'react';
import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';
import { useNutrition } from '../controller/useNutrition';

interface ProteinLoggingProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

const ProteinLogging: React.FC<ProteinLoggingProps> = ({ isOpen, onClose, userId }) => {
  const [amount, setAmount] = useState<string>('');
  const { logProtein, isLogging } = useNutrition(userId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await logProtein(amount);
    if (success) {
      setAmount('');
      onClose();
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
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 30"
              disabled={isLogging}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLogging}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLogging}>
              {isLogging ? 'Logging...' : 'Log Protein'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProteinLogging;