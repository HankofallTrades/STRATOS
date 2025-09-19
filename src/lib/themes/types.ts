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
  
  // Colors (CSS custom properties or Tailwind classes)
  colors: {
    background: {
      primary: string
      secondary: string
      card: string
    }
    text: {
      primary: string
      secondary: string
      accent: string
    }
    accent: {
      primary: string
      secondary: string
      border: string
    }
    button: {
      default: string
      active: string
      hover: string
    }
  }
  
  // Component styling
  components: {
    header: {
      titleClasses: string
      taglineClasses: string
      containerClasses: string
    }
    disciplineCard: {
      containerClasses: string
      titleClasses: string
      dividerClasses: string
    }
    habitButton: {
      defaultClasses: string
      activeClasses: string
      iconClasses: string
      labelClasses: string
    }
  }
}

export type ThemeId = 'fantasy' | 'modern' | 'cyberpunk'
