// This file is no longer needed after refactoring to use string types directly.
// Keeping the file for now in case other parts of the codebase still reference it,
// but its contents can be safely removed once fully verified.

export type EquipmentType = 'DB' | 'BB' | 'KB' | 'Cable' | 'Free' | 'Machine';

export const EquipmentTypeEnum = {
    DB: 'DB',
    BB: 'BB',
    KB: 'KB',
    Cable: 'Cable',
    Free: 'Free',
    Machine: 'Machine'
} as const; 