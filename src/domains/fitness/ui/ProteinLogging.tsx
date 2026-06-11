import React, { useState } from 'react';
import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';
import { useNutrition } from '../hooks/useNutrition';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="stone-panel w-full max-w-md rounded-[24px] border-white/10 p-6 motion-safe:animate-fade-rise">
        <h2 className="mb-5 text-xl font-semibold tracking-tight text-foreground">Log Protein</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-5 space-y-2">
            <label
              htmlFor="proteinAmount"
              className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground"
            >
              Grams
            </label>
            <Input
              id="proteinAmount"
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 30"
              disabled={isLogging}
              className="app-form-input stone-inset h-11 rounded-[16px] border-0 px-3 text-sm tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0"
            />
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

export default ProteinLogging;