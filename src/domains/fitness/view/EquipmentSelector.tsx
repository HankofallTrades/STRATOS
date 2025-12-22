import React, { useState } from 'react';
import { Button } from "@/components/core/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/core/popover";
import { Input } from "@/components/core/input";
import { Check, X, Plus } from 'lucide-react';

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
          variant="outline"
          size="sm"
          className="rounded-full h-7 px-2.5 text-xs w-auto border-border"
          disabled={disabled}
        >
          {selectedEquipment ?? "Equipment"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1">
        <div className="flex flex-col gap-1">
          {equipmentTypes.map((type) => (
            <Button
              key={type}
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 px-2 text-xs"
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
          {/* Add New Equipment Button / Input */} 
          <div className="mt-1 pt-1 border-t border-border">
            {showNewEquipmentInput ? (
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  placeholder="New Equipment"
                  value={newEquipmentName}
                  onChange={(e) => setNewEquipmentName(e.target.value)}
                  className="h-8 px-2 text-xs flex-grow"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddNewEquipment();
                    if (e.key === 'Escape') handleCancelAddNew();
                  }}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={handleAddNewEquipment} disabled={!newEquipmentName.trim()}>
                  <Check size={16} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={handleCancelAddNew}>
                  <X size={16} />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-2 text-xs text-blue-600 dark:text-blue-400"
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