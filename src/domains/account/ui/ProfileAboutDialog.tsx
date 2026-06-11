import { useEffect, useState } from 'react';

import { Button } from '@/components/core/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/core/Dialog';
import { Input } from '@/components/core/input';
import { Label } from '@/components/core/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/core/select';
import type { ProfileRow, ProfileUpdateData } from '@/domains/account/data/accountRepository';

interface ProfileAboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileRow | null;
  isSaving: boolean;
  onSubmit: (data: ProfileUpdateData) => void;
}

const toNumberOrNull = (value: string): number | null => {
  const n = Number(value);
  return value.trim() === '' || Number.isNaN(n) ? null : n;
};

export const ProfileAboutDialog = ({
  open,
  onOpenChange,
  profile,
  isSaving,
  onSubmit,
}: ProfileAboutDialogProps) => {
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [experience, setExperience] = useState<string>('');
  const [trainingAge, setTrainingAge] = useState('');

  useEffect(() => {
    if (!open) return;
    setAge(profile?.age?.toString() ?? '');
    setHeight(profile?.height?.toString() ?? '');
    setWeight(profile?.weight?.toString() ?? '');
    setExperience(profile?.experience_level ?? '');
    setTrainingAge(profile?.training_age_years?.toString() ?? '');
  }, [open, profile]);

  const handleSave = () => {
    onSubmit({
      age: toNumberOrNull(age),
      height: toNumberOrNull(height),
      weight: toNumberOrNull(weight),
      experience_level: experience === '' ? null : experience,
      training_age_years: toNumberOrNull(trainingAge),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="stone-panel rounded-[24px] border-white/10">
        <DialogHeader>
          <DialogTitle>About you</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="about-age">Age</Label>
            <Input id="about-age" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="about-training-age">Training age (yrs)</Label>
            <Input id="about-training-age" type="number" value={trainingAge} onChange={(e) => setTrainingAge(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="about-height">Height</Label>
            <Input id="about-height" type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="about-weight">Weight</Label>
            <Input id="about-weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div className="space-y-1 col-span-2">
            <Label>Experience</Label>
            <Select value={experience} onValueChange={setExperience}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="app-primary-action h-10 rounded-[16px] px-5 text-sm font-semibold"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileAboutDialog;
