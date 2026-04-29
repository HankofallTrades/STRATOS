import React, { useState } from 'react';
import { Button } from "@/components/core/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/core/popover";
import { Input } from "@/components/core/input";
import { Check, ChevronDown, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  workoutMenuInputClassName,
  workoutMenuOptionClassName,
  workoutPopoverClassName,
} from './workoutSelectionStyles';

interface EquipmentSelectorProps {
  selectedEquipment: string | null;
  onSelectEquipment: (equipment: string | null) => void;
  equipmentTypes: readonly string[];
  disabled?: boolean;
  popoverOpen: boolean;
  setPopoverOpen: (open: boolean) => void;
}

const EquipmentSelector: React.FC<EquipmentSelectorProps> = ({
  selectedEquipment,
  onSelectEquipment,
  equipmentTypes,
  disabled,
  popoverOpen,
  setPopoverOpen,
}) => {
  const [showNewEquipmentInput, setShowNewEquipmentInput] = useState(false);
  const [newEquipmentName, setNewEquipmentName] = useState("");

  const handleAddNewEquipment = () => {
    if (newEquipmentName.trim()) {
      onSelectEquipment(newEquipmentName.trim());
      setNewEquipmentName("");
      setShowNewEquipmentInput(false);
      setPopoverOpen(false);
    }
  };

  const handleCancelAddNew = () => {
    setNewEquipmentName("");
    setShowNewEquipmentInput(false);
  };

  return (
    <Popover open={popoverOpen} onOpenChange={(isOpen) => {
      setPopoverOpen(isOpen);
      if (!isOpen) {
        setShowNewEquipmentInput(false);
        setNewEquipmentName("");
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="stone-chip h-10 min-w-[124px] justify-between rounded-[14px] px-3 text-xs text-foreground/88 hover:bg-white/[0.05] hover:text-foreground"
          disabled={disabled}
        >
          <span className="truncate">{selectedEquipment ?? "Equipment"}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={workoutPopoverClassName}>
        <div className="flex flex-col gap-1">
          {equipmentTypes.map((type) => (
            <Button
              key={type}
              variant="ghost"
              size="sm"
              className={workoutMenuOptionClassName}
              onClick={() => {
                onSelectEquipment(type);
                setShowNewEquipmentInput(false);
                setPopoverOpen(false);
              }}
              disabled={selectedEquipment === type}
            >
              {type}
            </Button>
          ))}
          <div className="mt-2 border-t border-white/8 pt-2">
            {showNewEquipmentInput ? (
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  placeholder="New Equipment"
                  value={newEquipmentName}
                  onChange={(e) => setNewEquipmentName(e.target.value)}
                  className={cn(workoutMenuInputClassName, "h-10 flex-grow px-3 text-xs")}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddNewEquipment();
                    if (e.key === 'Escape') handleCancelAddNew();
                  }}
                />
                <Button variant="ghost" size="icon" className="verdigris-emblem h-10 w-10 rounded-[14px] p-0 hover:bg-white/[0.04]" onClick={handleAddNewEquipment} disabled={!newEquipmentName.trim()}>
                  <Check size={16} />
                </Button>
                <Button variant="ghost" size="icon" className="stone-chip h-10 w-10 rounded-[14px] p-0 text-muted-foreground hover:bg-white/[0.05] hover:text-foreground" onClick={handleCancelAddNew}>
                  <X size={16} />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className={`${workoutMenuOptionClassName} verdigris-text hover:text-foreground`}
                onClick={() => {
                  setShowNewEquipmentInput(true);
                  setNewEquipmentName("");
                }}
              >
                <Plus size={14} className="mr-1" /> Add New
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EquipmentSelector; 
