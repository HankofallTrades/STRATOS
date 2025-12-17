import React from 'react'
import { Toggle } from '@/components/core/Toggle/toggle'
import { useTheme } from '@/lib/themes'

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
        className={`h-16 w-16 rounded-full border-2 transition-all duration-300 ${pressed
            ? `${activeClassName} shadow-lg shadow-primary/30 border-primary`
            : `bg-secondary border-border hover:border-primary hover:shadow-md hover:shadow-primary/40`
          }`}
      >
        <span className={`transition-colors duration-300 ${pressed ? 'text-white drop-shadow-sm' : 'text-muted-foreground'
          }`}>
          {icon}
        </span>
      </Toggle>
      <p className="mt-3 text-center text-sm text-muted-foreground font-medium tracking-wide">
        {label}
      </p>
    </div>
  )
}
