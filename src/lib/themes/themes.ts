import type { AppTheme } from './types'

export const fantasyTheme: AppTheme = {
  id: 'fantasy',
  name: 'Mythos',
  description: 'Ornate fantasy theme with gold accents and parchment textures',
  
  brand: {
    name: 'MYTHOS',
    tagline: 'Forge your legend',
    font: 'font-serif'
  },
  
  colors: {
    background: {
              primary: 'bg-amber-100 papyrus-texture',
      secondary: 'bg-gradient-to-br from-amber-900/60 via-yellow-900/40 to-orange-900/60',
      card: 'backdrop-blur-sm border border-amber-600/40'
    },
    text: {
      primary: 'text-amber-200',
      secondary: 'text-amber-300',
      accent: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent'
    },
    accent: {
      primary: 'amber-500',
      secondary: 'amber-400',
      border: 'border-amber-500/50'
    },
    button: {
      default: 'bg-gradient-to-br from-amber-900/40 to-yellow-900/40 border-amber-500/50',
      active: 'shadow-lg shadow-amber-500/30 border-amber-400',
      hover: 'hover:border-amber-400 hover:shadow-md hover:shadow-amber-400/40'
    }
  },
  
  components: {
    header: {
              titleClasses: 'text-6xl md:text-7xl font-bold mb-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-lg font-serif tracking-wider',
              taglineClasses: 'text-amber-400 mb-6 text-lg font-medium italic tracking-wide',
      containerClasses: 'flex flex-col items-center justify-between mb-12 text-center pt-8'
    },
    disciplineCard: {
      containerClasses: 'mb-6 bg-gradient-to-br from-amber-900/60 via-yellow-900/40 to-orange-900/60 backdrop-blur-sm border border-amber-600/40 rounded-2xl p-8 shadow-xl shadow-amber-900/50',
      titleClasses: 'text-center text-xl font-bold tracking-[0.2em] text-amber-200 font-serif mb-2',
      dividerClasses: 'inline-block w-16 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80'
    },
    habitButton: {
      defaultClasses: 'h-16 w-16 rounded-full border-2 transition-all duration-300',
      activeClasses: 'shadow-lg shadow-amber-500/30 border-amber-400',
      iconClasses: 'transition-colors duration-300',
      labelClasses: 'mt-3 text-center text-sm text-amber-200 font-medium tracking-wide'
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
    background: {
      primary: 'bg-background',
      secondary: 'bg-card',
      card: 'border border-border'
    },
    text: {
      primary: 'text-foreground',
      secondary: 'text-muted-foreground',
      accent: 'text-primary'
    },
    accent: {
      primary: 'blue-500',
      secondary: 'blue-400',
      border: 'border-border'
    },
    button: {
      default: 'bg-background border-border',
      active: 'shadow-md',
      hover: 'hover:bg-accent hover:text-accent-foreground'
    }
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
      defaultClasses: 'h-16 w-16 rounded-full border transition-colors',
      activeClasses: 'shadow-md',
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
    background: {
      primary: 'bg-gradient-to-b from-slate-900 via-gray-900 to-black',
      secondary: 'bg-gradient-to-br from-slate-800/80 via-gray-800/60 to-slate-900/80',
      card: 'backdrop-blur-sm border border-cyan-500/30'
    },
    text: {
      primary: 'text-cyan-300',
      secondary: 'text-slate-300',
      accent: 'bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent'
    },
    accent: {
      primary: 'cyan-500',
      secondary: 'cyan-400',
      border: 'border-cyan-500/50'
    },
    button: {
      default: 'bg-gradient-to-br from-slate-800 to-gray-900 border-cyan-500/50',
      active: 'shadow-lg shadow-cyan-500/25 border-cyan-400',
      hover: 'hover:border-cyan-400 hover:shadow-md hover:shadow-cyan-400/30'
    }
  },
  
  components: {
    header: {
      titleClasses: 'text-6xl md:text-7xl font-bold mb-3 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg font-mono tracking-wider',
      taglineClasses: 'text-cyan-300 mb-6 text-lg font-medium tracking-wide font-mono',
      containerClasses: 'flex flex-col items-center justify-between mb-12 text-center pt-8'
    },
    disciplineCard: {
      containerClasses: 'mb-6 bg-gradient-to-br from-slate-800/80 via-gray-800/60 to-slate-900/80 backdrop-blur-sm border border-cyan-500/30 rounded-2xl p-8 shadow-xl shadow-cyan-500/10',
      titleClasses: 'text-center text-xl font-bold tracking-[0.2em] text-cyan-300 font-mono mb-2',
      dividerClasses: 'inline-block w-16 h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-70'
    },
    habitButton: {
      defaultClasses: 'h-16 w-16 rounded-full border-2 transition-all duration-300',
      activeClasses: 'shadow-lg shadow-cyan-500/25 border-cyan-400',
      iconClasses: 'transition-colors duration-300',
      labelClasses: 'mt-3 text-center text-sm text-cyan-300 font-medium tracking-wide font-mono'
    }
  }
}

export const themes: Record<string, AppTheme> = {
  fantasy: fantasyTheme,
  modern: modernTheme,
  cyberpunk: cyberpunkTheme
}

export const defaultTheme = fantasyTheme
