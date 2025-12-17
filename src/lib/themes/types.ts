export interface AppTheme {
  id: string
  name: string
  description: string

  // Brand
  brand: {
    name: string
    tagline: string
    font: string // CSS font family
  }

  // Colors (CSS variable values, e.g. HSL channels or hex)
  colors: {
    background: string
    foreground: string

    card: string
    cardForeground: string

    popover: string
    popoverForeground: string

    primary: string
    primaryForeground: string

    secondary: string
    secondaryForeground: string

    muted: string
    mutedForeground: string

    accent: string
    accentForeground: string

    destructive: string
    destructiveForeground: string

    border: string
    input: string
    ring: string

    // Sidebar
    sidebarBackground: string
    sidebarForeground: string
    sidebarPrimary: string
    sidebarPrimaryForeground: string
    sidebarAccent: string
    sidebarAccentForeground: string
    sidebarBorder: string
    sidebarRing: string
  }

  // Component styling (optional overrides or specific classes if absolutely needed, but prefer global theme vars)
  // Keeping this minimal as we want to rely on standard Tailwind classes
  components?: {
    header?: {
      titleClasses?: string
      taglineClasses?: string
      containerClasses?: string
    }
    disciplineCard?: {
      containerClasses?: string
      titleClasses?: string
      dividerClasses?: string
    }
    habitButton?: {
      defaultClasses?: string
      activeClasses?: string
      iconClasses?: string
      labelClasses?: string
    }
  }
}

export type ThemeId = 'fantasy' | 'modern' | 'cyberpunk'
