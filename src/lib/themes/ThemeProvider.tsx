import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { AppTheme, ThemeId } from './types'
import { themes, defaultTheme } from './themes'

interface ThemeContextType {
  currentTheme: AppTheme
  themeId: ThemeId
  setTheme: (themeId: ThemeId) => void
  availableThemes: AppTheme[]
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    // Load from localStorage or use default
    const saved = localStorage.getItem('app-theme')
    return (saved && themes[saved]) ? saved as ThemeId : defaultTheme.id as ThemeId
  })

  const currentTheme = themes[themeId] || defaultTheme

  const setTheme = (newThemeId: ThemeId) => {
    setThemeId(newThemeId)
    localStorage.setItem('app-theme', newThemeId)
  }

  const availableThemes = Object.values(themes)

  // Apply theme to document root for CSS custom properties if needed
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeId)
  }, [themeId])

  return (
    <ThemeContext.Provider value={{
      currentTheme,
      themeId,
      setTheme,
      availableThemes
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
