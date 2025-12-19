import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/core/Dialog";
import { OnboardingForm } from './OnboardingForm';
import { Button } from '@/components/core/button';

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void; // Callback for when onboarding is successfully completed
}

export const OnboardingDialog: React.FC<OnboardingDialogProps> = ({
  open,
  onOpenChange,
  onComplete,
}) => {

  const handleSuccess = () => {
    // Call the onComplete callback passed from the parent
    onComplete();
    // Optionally close the dialog, or let the parent handle it via onComplete
    // onOpenChange(false);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]"> {/* Or adjust width as needed */}
        <DialogHeader>
          <DialogTitle>Welcome to STRATOS!</DialogTitle>
          <DialogDescription>
            Let's get some basic information to personalize your experience.
          </DialogDescription>
        </DialogHeader>

        {/* Placeholder for the form */}
        <div className="py-4">
          <OnboardingForm onSuccess={handleSuccess} />
        </div>

        {/* Footer might be handled by the form's submit button later */}
        {/* <DialogFooter>
          <Button type="submit" form="onboarding-form">Save changes</Button>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
}; 