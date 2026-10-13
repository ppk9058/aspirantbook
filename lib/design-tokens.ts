/**
 * aspirantbook Design System Tokens
 * Centralized design constants to replace hardcoded values across components.
 */

// Brand Colors (use Tailwind classes when possible, these are for JS logic)
export const colors = {
  brand: {
    primary: '#1448d8',
    primaryHover: '#0f37a8',
    secondary: '#1DB954',
    navy: '#05192D',
    navyLight: '#0a2540',
    navyLighter: '#0d2f52',
  },
  gamification: {
    xp: '#F59E0B',
    streak: '#F97316',
    level: '#1DB954',
    achievement: '#8B5CF6',
  },
  difficulty: {
    beginner: '#22C55E',
    intermediate: '#F59E0B',
    advanced: '#EF4444',
  },
} as const

// Spacing scale (in px)
export const spacing = {
  navHeight: 48,
  navHeightMobile: 48,
  sidebarWidth: 240,
  sidebarCollapsedWidth: 64,
  bottomNavHeight: 72,
  contentMaxWidth: 1280,
  cardBorderRadius: 16,
} as const

// Z-index scale
export const zIndex = {
  bottomNav: 40,
  sidebar: 45,
  topNav: 50,
  dropdown: 60,
  modal: 70,
  toast: 80,
  tooltip: 90,
} as const

// Animation durations (in ms)
export const animation = {
  fast: 150,
  normal: 250,
  slow: 400,
  pageTransition: 300,
} as const

// Breakpoints (match Tailwind config)
export const breakpoints = {
  xs: 375,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1920,
} as const
