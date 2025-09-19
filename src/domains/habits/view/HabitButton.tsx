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
  const { currentTheme } = useTheme()
  
  return (
    <div className="flex flex-col items-center">
      <Toggle
        pressed={pressed}
        onPressedChange={onPressedChange}
        aria-label={`${label} habit`}
        disabled={disabled}
        className={`${currentTheme.components.habitButton.defaultClasses} ${
          pressed 
            ? `${activeClassName} ${currentTheme.components.habitButton.activeClasses}` 
            : `${currentTheme.colors.button.default} ${currentTheme.colors.accent.border} ${currentTheme.colors.button.hover}`
        }`}
      >
        <span className={`${currentTheme.components.habitButton.iconClasses} ${
          pressed ? 'text-white drop-shadow-sm' : currentTheme.colors.text.secondary
        }`}>
          {icon}
        </span>
      </Toggle>
      <p className={currentTheme.components.habitButton.labelClasses}>
        {label}
      </p>
    </div>
  )
}
