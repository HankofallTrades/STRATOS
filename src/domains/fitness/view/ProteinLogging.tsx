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

  return (
    <Dialog open={isOpen} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Protein Intake</DialogTitle>
          <DialogDescription>
            Add a quick protein entry without leaving the current screen.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="proteinAmount" className="block text-sm font-medium text-muted-foreground">
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
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLogging}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLogging}>
              {isLogging ? 'Logging...' : 'Log Protein'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProteinLogging;
