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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${categoryLabel}` : `Add ${categoryLabel}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="fact-content">Description</Label>
          <Input
            id="fact-content"
            value={content}
            autoFocus
            placeholder={placeholder}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && trimmed) onSubmit(trimmed);
            }}
          />
        </div>
        <DialogFooter className="flex items-center justify-between gap-2">
          {isEditing && onDelete ? (
            <Button variant="ghost" className="text-destructive" onClick={onDelete} disabled={isSaving}>
              Remove
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={() => onSubmit(trimmed)} disabled={!trimmed || isSaving}>
            {isEditing ? 'Save' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileFactDialog;
