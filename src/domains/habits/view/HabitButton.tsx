import React from 'react'
import { Toggle } from '@/components/core/Toggle/toggle'

export type HabitButtonProps = {
  label: string
  pressed: boolean
  disabled?: boolean
  onPressedChange: () => void
  icon: React.ReactNode
  activeClassName: string
}

export const HabitButton: React.FC<HabitButtonProps> = ({
  label,
  pressed,
  disabled = false,
  onPressedChange,
  icon,
  activeClassName,
}) => {
  return (
    <div className="flex flex-col items-center">
      <Toggle
        pressed={pressed}
        onPressedChange={onPressedChange}
        aria-label={`${label} habit`}
        disabled={disabled}
        className={`h-16 w-16 rounded-full border ${pressed ? activeClassName : 'bg-background '}`}
      >
        <span className={pressed ? 'text-white' : 'text-muted-foreground'}>{icon}</span>
      </Toggle>
      <p className="mt-2 text-center text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
