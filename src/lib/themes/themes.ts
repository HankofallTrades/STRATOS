import type { AppTheme } from './types'

export const fantasyTheme: AppTheme = {
  id: 'fantasy',
  name: 'Mythos',
  description: 'Dark moss green theme with organic vibes',

  brand: {
    name: 'MYTHOS',
    tagline: 'Forge your legend',
    font: 'font-serif'
  },

  colors: {
    // Mythos Palette
    // Background: Dark Slate Stone (Cool dark grey)
    background: '215 25% 8%', // #0F131A

    // Foreground: Light Moss (almost white)
    foreground: '140 20% 95%', // #EBF5EC

    // Cards: Dark Moss (sitting on top of stone) -> Now matches background for reduced clutter
    card: '215 25% 8%', // #0F131A (Was #15261A)
    cardForeground: '140 20% 90%', // #DDECDF

    popover: '140 30% 12%',
    popoverForeground: '140 20% 90%',

    // Primary: Vibrant Moss Green
    primary: '140 50% 45%', // #39AD69
    primaryForeground: '140 20% 98%',

    // Secondary: Deep Moss
    secondary: '140 30% 20%', // #24422E
    secondaryForeground: '140 20% 90%',

    muted: '215 20% 15%', // Slate-ish muted
    mutedForeground: '140 10% 60%',

    accent: '140 40% 25%', // Mossy accent
    accentForeground: '140 20% 95%',

    destructive: '0 60% 30%',
    destructiveForeground: '0 0% 98%',

    border: '215 20% 20%', // Subtle border, slightly lighter than background (Was '215 25% 8%')
    input: '140 30% 20%',
    ring: '140 50% 45%',

    // Sidebar (Matches background for seamless look)
    sidebarBackground: '215 25% 8%', // #0F131A
    sidebarForeground: '140 20% 95%',
    sidebarPrimary: '140 50% 45%',
    sidebarPrimaryForeground: '140 20% 98%',
    sidebarAccent: '140 30% 20%',
    sidebarAccentForeground: '140 20% 95%',
    sidebarBorder: '215 25% 8%', // Matches background
    sidebarRing: '140 50% 45%',
  },

  components: {
    header: {
      titleClasses: 'text-6xl md:text-7xl font-bold mb-3 text-primary drop-shadow-lg font-serif tracking-wider',
      taglineClasses: 'text-muted-foreground mb-6 text-lg font-medium italic tracking-wide',
      containerClasses: 'flex flex-col items-center justify-between mb-12 text-center pt-8'
    },
    disciplineCard: {
      containerClasses: 'mb-6 bg-card rounded-2xl p-8 shadow-xl', // Removed border border-border
      titleClasses: 'text-center text-xl font-bold tracking-[0.2em] text-primary font-serif mb-2',
      dividerClasses: 'inline-block w-16 h-0.5 bg-primary opacity-80'
    },
    habitButton: {
      defaultClasses: 'h-16 w-16 rounded-full border-2 transition-all duration-300 bg-secondary border-border',
      activeClasses: 'shadow-lg shadow-primary/30 border-primary bg-primary text-primary-foreground',
      iconClasses: 'transition-colors duration-300',
      labelClasses: 'mt-3 text-center text-sm text-muted-foreground font-medium tracking-wide'
    }
  }
}

export const modernTheme: AppTheme = {
  id: 'modern',
  name: 'Stratos',
  description: 'Clean modern theme with blue accents',

  brand: {
    name: 'STRATOS',
    tagline: 'Elevate your game',
    font: 'font-sans'
  },

  colors: {
    background: '0 0% 100%',
    foreground: '222.2 84% 4.9%',

    card: '0 0% 100%',
    cardForeground: '222.2 84% 4.9%',

    popover: '0 0% 100%',
    popoverForeground: '222.2 84% 4.9%',

    primary: '222.2 47.4% 11.2%',
    primaryForeground: '210 40% 98%',

    secondary: '210 40% 96.1%',
    secondaryForeground: '222.2 47.4% 11.2%',

    muted: '210 40% 96.1%',
    mutedForeground: '215.4 16.3% 46.9%',

    accent: '210 40% 96.1%',
    accentForeground: '222.2 47.4% 11.2%',

    destructive: '0 84.2% 60.2%',
    destructiveForeground: '210 40% 98%',

    border: '214.3 31.8% 91.4%',
    input: '214.3 31.8% 91.4%',
    ring: '222.2 84% 4.9%',

    // Sidebar
    sidebarBackground: '0 0% 98%',
    sidebarForeground: '240 5.3% 26.1%',
    sidebarPrimary: '240 5.9% 10%',
    sidebarPrimaryForeground: '0 0% 98%',
    sidebarAccent: '240 4.8% 95.9%',
    sidebarAccentForeground: '240 5.9% 10%',
    sidebarBorder: '220 13% 91%',
    sidebarRing: '217.2 91.2% 59.8%',
  },

  components: {
    header: {
      titleClasses: 'text-5xl md:text-6xl font-bold mb-2 text-primary uppercase tracking-wide',
      taglineClasses: 'text-muted-foreground mb-6 text-base',
      containerClasses: 'flex flex-col items-center justify-between mb-8 text-center pt-8'
    },
    disciplineCard: {
      containerClasses: 'mb-6 bg-card border border-border rounded-lg p-6 shadow-sm',
      titleClasses: 'text-center text-base font-semibold tracking-wide text-muted-foreground mb-4',
      dividerClasses: 'hidden'
    },
    habitButton: {
      defaultClasses: 'h-16 w-16 rounded-full border transition-colors bg-background border-border',
      activeClasses: 'shadow-md bg-primary text-primary-foreground border-primary',
      iconClasses: 'transition-colors',
      labelClasses: 'mt-2 text-center text-xs text-muted-foreground'
    }
  }
}

export const cyberpunkTheme: AppTheme = {
  id: 'cyberpunk',
  name: 'NEXUS',
  description: 'Futuristic cyberpunk theme with neon accents',

  brand: {
    name: 'NEXUS',
    tagline: 'Jack in. Level up.',
    font: 'font-mono'
  },

  colors: {
    background: '224 71% 4%', // #020412
    foreground: '210 40% 98%',

    card: '222 47% 11%', // #0F172A
    cardForeground: '210 40% 98%',

    popover: '222 47% 11%',
    popoverForeground: '210 40% 98%',

    primary: '180 100% 50%', // Cyan
    primaryForeground: '222.2 47.4% 11.2%',

    secondary: '217.2 32.6% 17.5%',
    secondaryForeground: '210 40% 98%',

    muted: '217.2 32.6% 17.5%',
    mutedForeground: '215 20.2% 65.1%',

    accent: '280 100% 60%', // Purple
    accentForeground: '210 40% 98%',

    destructive: '0 62.8% 30.6%',
    destructiveForeground: '210 40% 98%',

    border: '217.2 32.6% 17.5%',
    input: '217.2 32.6% 17.5%',
    ring: '180 100% 50%',

    // Sidebar
    sidebarBackground: '240 5.9% 10%',
    sidebarForeground: '240 4.8% 95.9%',
    sidebarPrimary: '224.3 76.3% 48%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '240 3.7% 15.9%',
    sidebarAccentForeground: '240 4.8% 95.9%',
    sidebarBorder: '240 3.7% 15.9%',
    sidebarRing: '217.2 91.2% 59.8%',
  },

  components: {
    header: {
      titleClasses: 'text-6xl md:text-7xl font-bold mb-3 text-primary drop-shadow-lg font-mono tracking-wider',
      taglineClasses: 'text-accent mb-6 text-lg font-medium tracking-wide font-mono',
      containerClasses: 'flex flex-col items-center justify-between mb-12 text-center pt-8'
    },
    disciplineCard: {
      containerClasses: 'mb-6 bg-card/80 backdrop-blur-sm border border-primary/30 rounded-2xl p-8 shadow-xl shadow-primary/10',
      titleClasses: 'text-center text-xl font-bold tracking-[0.2em] text-primary font-mono mb-2',
      dividerClasses: 'inline-block w-16 h-0.5 bg-primary opacity-70'
    },
    habitButton: {
      defaultClasses: 'h-16 w-16 rounded-full border-2 transition-all duration-300 bg-secondary/50 border-primary/30',
      activeClasses: 'shadow-lg shadow-primary/25 border-primary bg-primary/20 text-primary',
      iconClasses: 'transition-colors duration-300',
      labelClasses: 'mt-3 text-center text-sm text-primary font-medium tracking-wide font-mono'
    }
  }
}

export const themes: Record<string, AppTheme> = {
  fantasy: fantasyTheme,
  modern: modernTheme,
  cyberpunk: cyberpunkTheme
}

export const defaultTheme = fantasyTheme
