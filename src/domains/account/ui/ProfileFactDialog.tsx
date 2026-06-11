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

interface ProfileFactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryLabel: string;
  /** Category-specific example text shown when the field is empty. */
  placeholder?: string;
  /** Existing content when editing; empty string when adding. */
  initialContent?: string;
  isEditing: boolean;
  isSaving: boolean;
  onSubmit: (content: string) => void;
  onDelete?: () => void;
}

export const ProfileFactDialog = ({
  open,
  onOpenChange,
  categoryLabel,
  placeholder,
  initialContent = '',
  isEditing,
  isSaving,
  onSubmit,
  onDelete,
}: ProfileFactDialogProps) => {
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    if (open) setContent(initialContent);
  }, [open, initialContent]);

  const trimmed = content.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="stone-panel rounded-[24px] border-white/10">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${categoryLabel}` : `Add ${categoryLabel}`}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Label htmlFor="fact-content" className="sr-only">
            Description
          </Label>
          <Input
            id="fact-content"
            value={content}
            autoFocus
            placeholder={placeholder}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && trimmed) onSubmit(trimmed);
            }}
            className="app-form-input stone-inset h-11 rounded-[16px] border-0 px-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <DialogFooter className="flex items-center justify-between gap-2">
          {isEditing && onDelete ? (
            <Button
              variant="ghost"
              className="h-10 rounded-[16px] px-4 text-sm font-medium text-rose-300/90 hover:bg-rose-500/10 hover:text-rose-200"
              onClick={onDelete}
              disabled={isSaving}
            >
              Remove
            </Button>
          ) : (
            <span />
          )}
          <Button
            onClick={() => onSubmit(trimmed)}
            disabled={!trimmed || isSaving}
            className="app-primary-action h-10 rounded-[16px] px-5 text-sm font-semibold"
          >
            {isEditing ? 'Save' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileFactDialog;
