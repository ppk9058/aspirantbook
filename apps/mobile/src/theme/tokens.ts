/**
 * DESIGN TOKENS: Mobile parity with TrillionSkill / aspirantbook web
 *
 * Web sources of truth:
 * - tailwind.config.ts: custom color scales, brand definitions, fonts, radii
 * - app/globals.css: CSS custom properties, light/dark base backgrounds, safe-area utilities
 * - components/layout/MobileAppHeader.tsx: 56px sticky header, brand logo gradient, notifications
 * - components/layout/MobileDrawer.tsx: 80% max-320px left drawer, nav item badges
 * - components/layout/MobileProfileSheet.tsx: right slide-out profile sheet, pass badges
 * - components/layout/MobileNativeBottomBar.tsx: 60px bottom bar, active indicators, 44px touch targets
 */

export const WEB_SOURCES = {
  tailwindConfig: "tailwind.config.ts",
  globalsCss: "app/globals.css",
  header: "components/layout/MobileAppHeader.tsx",
  drawer: "components/layout/MobileDrawer.tsx",
  profileSheet: "components/layout/MobileProfileSheet.tsx",
  bottomBar: "components/layout/MobileNativeBottomBar.tsx",
  themeProvider: "components/providers/ThemeProvider.tsx",
} as const;

export const COLOR_PALETTE = {
  // Brand Teal Palette (web: tailwind.config.ts#L30-L41 - mapped to deep blue/indigo brand)
  teal: {
    50: "#eff6ff",   // tailwind.config.ts#L31
    100: "#dbeafe",  // tailwind.config.ts#L32
    200: "#bfdbfe",  // tailwind.config.ts#L33
    300: "#93c5fd",  // tailwind.config.ts#L34
    400: "#60a5fa",  // tailwind.config.ts#L35
    500: "#1448d8",  // tailwind.config.ts#L36 (Brand primary)
    600: "#0f37a8",  // tailwind.config.ts#L37
    700: "#0b297c",  // tailwind.config.ts#L38
    800: "#081f5e",  // tailwind.config.ts#L39
    900: "#061640",  // tailwind.config.ts#L40
    950: "#030d28",  // tailwind.config.ts#L41
  },

  // Tailwind Slate Neutral Scale (web: used across MobileDrawer.tsx & MobileProfileSheet.tsx)
  slate: {
    50: "#f8fafc",   // MobileDrawer.tsx#L95
    100: "#f1f5f9",  // MobileDrawer.tsx#L74
    200: "#e2e8f0",  // MobileAppHeader.tsx#L47
    300: "#cbd5e1",  // MobileAppHeader.tsx#L75
    400: "#94a3b8",  // MobileDrawer.tsx#L88
    500: "#64748b",  // MobileDrawer.tsx#L96
    600: "#475569",  // MobileAppHeader.tsx#L75
    700: "#334155",  // MobileAppHeader.tsx#L54
    800: "#1e293b",  // MobileAppHeader.tsx#L47
    900: "#0f172a",  // MobileAppHeader.tsx#L47
    950: "#020617",  // MobileDrawer.tsx#L66 (Backdrop slate-950/60)
  },

  // Success / Emerald Scale (web: MobileAppHeader.tsx#L60, MobileProfileSheet.tsx#L110, tailwind.config.ts#L43-L54)
  emerald: {
    400: "#34d399",  // MobileProfileSheet.tsx#L110
    500: "#10b981",  // MobileAppHeader.tsx#L60 (gradient end)
    600: "#059669",  // MobileAppHeader.tsx#L109
    700: "#047857",  // MobileNativeBottomBar.tsx#L126 (Pass active badge)
  },

  // Rose Scale (web: MobileAppHeader.tsx#L87 notification dot, MobileProfileSheet.tsx#L167 logout)
  rose: {
    50: "#fff1f2",   // MobileProfileSheet.tsx#L167
    500: "#f43f5e",  // MobileAppHeader.tsx#L87 (Notification dot rose-500)
    600: "#e11d48",  // MobileProfileSheet.tsx#L167 (Logout text rose-600)
    950: "#4c0519",  // MobileProfileSheet.tsx#L167
  },

  // Amber / Warning Scale (web: tailwind.config.ts#L55-L66, MobileDrawer.tsx#L141)
  amber: {
    400: "#fbbf24",  // MobileDrawer.tsx#L141 (Sun icon in dark mode)
    500: "#f59e0b",  // tailwind.config.ts#L61
  },
} as const;

export const LIGHT_THEME = {
  mode: "light" as const,
  // Base backgrounds (web: app/globals.css#L7, L62)
  background: "#F8F9FA",       // app/globals.css#L62
  surface: "#FFFFFF",          // app/globals.css#L9
  surfaceSecondary: "#f8fafc", // slate-50 (MobileDrawer.tsx#L95)
  surfaceElevated: "#FFFFFF",

  // Header tokens (web: components/layout/MobileAppHeader.tsx#L47)
  headerBackground: "rgba(255, 255, 255, 0.95)", // bg-white/95
  headerBorder: "rgba(226, 232, 240, 0.8)",      // border-slate-200/80
  headerHeight: 56,                               // h-14 (MobileAppHeader.tsx#L47)

  // Bottom Navigation tokens (web: components/layout/MobileNativeBottomBar.tsx#L99-L101)
  bottomBarBackground: "rgba(255, 255, 255, 0.95)", // bg-white/95
  bottomBarBorder: "rgba(226, 232, 240, 0.9)",      // border-slate-200/90
  bottomBarHeight: 60,                              // h-15 (MobileNativeBottomBar.tsx#L101)
  bottomBarActive: COLOR_PALETTE.teal[700],         // text-teal-700 (MobileNativeBottomBar.tsx#L115)
  bottomBarInactive: COLOR_PALETTE.slate[600],      // text-slate-600 (MobileNativeBottomBar.tsx#L116)
  bottomBarDot: COLOR_PALETTE.teal[700],            // bg-teal-700 (MobileNativeBottomBar.tsx#L133)

  // Drawer & Sheet tokens (web: components/layout/MobileDrawer.tsx#L66-L72)
  drawerBackdrop: "rgba(2, 6, 23, 0.6)",            // bg-slate-950/60 (MobileDrawer.tsx#L66)
  drawerBackground: "#FFFFFF",                      // bg-white (MobileDrawer.tsx#L72)
  drawerBorder: COLOR_PALETTE.slate[200],           // border-slate-200 (MobileDrawer.tsx#L72)
  drawerActiveItemBg: COLOR_PALETTE.teal[50],       // bg-teal-50 (MobileDrawer.tsx#L116)
  drawerActiveItemText: COLOR_PALETTE.teal[700],    // text-teal-700 (MobileDrawer.tsx#L116)
  drawerInactiveItemText: COLOR_PALETTE.slate[700], // text-slate-700 (MobileDrawer.tsx#L117)
  drawerBadgeBg: COLOR_PALETTE.teal[100],           // bg-teal-100 (MobileDrawer.tsx#L125)
  drawerBadgeText: COLOR_PALETTE.teal[700],         // text-teal-700 (MobileDrawer.tsx#L125)

  // Brand identity tokens (web: components/layout/MobileAppHeader.tsx#L60-L65)
  brandFrom: COLOR_PALETTE.teal[500],               // from-teal-500 (#1448d8)
  brandTo: COLOR_PALETTE.emerald[500],              // to-emerald-500 (#10b981)
  brandTextPrimary: COLOR_PALETTE.slate[900],       // text-slate-900 (MobileAppHeader.tsx#L64)
  brandTextAccent: COLOR_PALETTE.teal[700],         // text-teal-700 (MobileAppHeader.tsx#L65)

  // Text colors (web: app/globals.css#L8, L63, MobileDrawer.tsx#L102)
  textPrimary: COLOR_PALETTE.slate[900],            // text-slate-900
  textSecondary: COLOR_PALETTE.slate[600],          // text-slate-600
  textMuted: COLOR_PALETTE.slate[400],              // text-slate-400
  textInverted: "#FFFFFF",

  // Interactive and borders
  border: COLOR_PALETTE.slate[200],                 // border-slate-200
  borderLight: COLOR_PALETTE.slate[100],            // border-slate-100
  primary: COLOR_PALETTE.teal[500],                 // #1448d8 (tailwind.config.ts#L36)
  primaryHover: COLOR_PALETTE.teal[600],            // #0f37a8
  notificationDot: COLOR_PALETTE.rose[500],         // rose-500 (#f43f5e, MobileAppHeader.tsx#L87)

  // Pass banner (web: components/layout/MobileProfileSheet.tsx#L110-L111)
  passActiveBg: "rgba(16, 185, 129, 0.1)",          // bg-emerald-500/10
  passActiveText: COLOR_PALETTE.emerald[700],       // text-emerald-700
  passActiveBorder: "rgba(16, 185, 129, 0.3)",      // border-emerald-500/30
  passUpgradeBg: COLOR_PALETTE.teal[600],           // bg-teal-600 (#0f37a8)
  passUpgradeText: "#FFFFFF",
  passBadgeBg: COLOR_PALETTE.emerald[700],          // bg-emerald-700 (MobileNativeBottomBar.tsx#L126)

  // Status tokens (web: tailwind.config.ts#L43-L78)
  success: COLOR_PALETTE.emerald[500],
  warning: COLOR_PALETTE.amber[500],
  danger: COLOR_PALETTE.rose[600],
};

export const DARK_THEME = {
  mode: "dark" as const,
  // Base backgrounds (web: app/globals.css#L35, app/layout.tsx#L55)
  background: "#05192D",       // app/layout.tsx#L55 (#05192D)
  surface: "#0f172a",          // slate-900 (MobileAppHeader.tsx#L47)
  surfaceSecondary: "#1e293b", // slate-800 (MobileDrawer.tsx#L95)
  surfaceElevated: "#1e293b",

  // Header tokens (web: components/layout/MobileAppHeader.tsx#L47)
  headerBackground: "rgba(15, 23, 42, 0.95)",  // bg-slate-900/95
  headerBorder: "#1e293b",                      // border-slate-800
  headerHeight: 56,                             // h-14

  // Bottom Navigation tokens (web: components/layout/MobileNativeBottomBar.tsx#L99-L101)
  bottomBarBackground: "rgba(15, 23, 42, 0.95)", // bg-slate-900/95
  bottomBarBorder: "#1e293b",                     // border-slate-800
  bottomBarHeight: 60,                            // h-15
  bottomBarActive: COLOR_PALETTE.teal[400],       // text-teal-400 (#60a5fa, MobileNativeBottomBar.tsx#L115)
  bottomBarInactive: COLOR_PALETTE.slate[400],    // text-slate-400 (MobileNativeBottomBar.tsx#L116)
  bottomBarDot: COLOR_PALETTE.teal[400],          // bg-teal-400 (MobileNativeBottomBar.tsx#L133)

  // Drawer & Sheet tokens (web: components/layout/MobileDrawer.tsx#L66-L72)
  drawerBackdrop: "rgba(2, 6, 23, 0.6)",          // bg-slate-950/60
  drawerBackground: "#0f172a",                    // bg-slate-900
  drawerBorder: COLOR_PALETTE.slate[800],         // border-slate-800
  drawerActiveItemBg: "rgba(3, 13, 40, 0.4)",     // bg-teal-950/40 (MobileDrawer.tsx#L116)
  drawerActiveItemText: COLOR_PALETTE.teal[300],  // text-teal-300 (MobileDrawer.tsx#L116)
  drawerInactiveItemText: COLOR_PALETTE.slate[300], // text-slate-300 (MobileDrawer.tsx#L117)
  drawerBadgeBg: "rgba(6, 22, 64, 0.5)",          // bg-teal-900/50 (MobileDrawer.tsx#L125)
  drawerBadgeText: COLOR_PALETTE.teal[300],       // text-teal-300 (MobileDrawer.tsx#L125)

  // Brand identity tokens (web: components/layout/MobileAppHeader.tsx#L60-L65)
  brandFrom: COLOR_PALETTE.teal[500],             // from-teal-500
  brandTo: COLOR_PALETTE.emerald[500],            // to-emerald-500
  brandTextPrimary: "#FFFFFF",                    // dark:text-white (MobileAppHeader.tsx#L64)
  brandTextAccent: COLOR_PALETTE.teal[400],       // dark:text-teal-400 (MobileAppHeader.tsx#L65)

  // Text colors (web: app/globals.css#L36, MobileAppHeader.tsx#L64)
  textPrimary: "#F8FAFC",                         // slate-50 / white
  textSecondary: COLOR_PALETTE.slate[300],        // text-slate-300
  textMuted: COLOR_PALETTE.slate[500],            // text-slate-500
  textInverted: COLOR_PALETTE.slate[900],

  // Interactive and borders
  border: COLOR_PALETTE.slate[800],               // border-slate-800
  borderLight: "rgba(30, 41, 59, 0.6)",
  primary: COLOR_PALETTE.teal[400],               // #60a5fa
  primaryHover: COLOR_PALETTE.teal[500],
  notificationDot: COLOR_PALETTE.rose[500],       // rose-500 (#f43f5e)

  // Pass banner (web: components/layout/MobileProfileSheet.tsx#L110-L111)
  passActiveBg: "rgba(16, 185, 129, 0.1)",        // bg-emerald-500/10
  passActiveText: COLOR_PALETTE.emerald[400],     // dark:text-emerald-400
  passActiveBorder: "rgba(16, 185, 129, 0.3)",    // border-emerald-500/30
  passUpgradeBg: COLOR_PALETTE.teal[600],         // bg-teal-600
  passUpgradeText: "#FFFFFF",
  passBadgeBg: COLOR_PALETTE.emerald[700],        // bg-emerald-700

  // Status tokens
  success: COLOR_PALETTE.emerald[400],
  warning: COLOR_PALETTE.amber[400],
  danger: COLOR_PALETTE.rose[500],
};

export interface ThemeColors {
  mode: "light" | "dark";
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceElevated: string;
  headerBackground: string;
  headerBorder: string;
  headerHeight: number;
  bottomBarBackground: string;
  bottomBarBorder: string;
  bottomBarHeight: number;
  bottomBarActive: string;
  bottomBarInactive: string;
  bottomBarDot: string;
  drawerBackdrop: string;
  drawerBackground: string;
  drawerBorder: string;
  drawerActiveItemBg: string;
  drawerActiveItemText: string;
  drawerInactiveItemText: string;
  drawerBadgeBg: string;
  drawerBadgeText: string;
  brandFrom: string;
  brandTo: string;
  brandTextPrimary: string;
  brandTextAccent: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverted: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryHover: string;
  notificationDot: string;
  passActiveBg: string;
  passActiveText: string;
  passActiveBorder: string;
  passUpgradeBg: string;
  passUpgradeText: string;
  passBadgeBg: string;
  success: string;
  warning: string;
  danger: string;
}

export const TOKENS = {
  // Dimensions (web: components/layout/*)
  dimensions: {
    headerHeight: 56,      // MobileAppHeader.tsx#L47 (h-14 = 56px)
    bottomBarHeight: 60,   // MobileNativeBottomBar.tsx#L101 (h-15 = 60px)
    minTouchTarget: 44,    // MobileNativeBottomBar.tsx#L113 (min-h-[44px])
    drawerMaxWidth: 320,   // MobileDrawer.tsx#L72 (max-w-xs = 320px)
    drawerWidthPercent: "80%" as const, // MobileDrawer.tsx#L72 (w-4/5 = 80%)
    cbtHeaderHeight: 52,   // Section 6 Phase 4 spec
  },

  // Spacing (web: standard Tailwind spacing 4px increments)
  spacing: {
    xs: 4,     // px-1 / py-1
    sm: 8,     // px-2 / py-2
    md: 12,    // p-3 (MobileDrawer.tsx#L95)
    lg: 16,    // p-4 (MobileDrawer.tsx#L74)
    xl: 20,    // p-5
    "2xl": 24, // p-6
    "3xl": 32, // p-8
  },

  // Radii (web: tailwind.config.ts#L121-L125)
  radius: {
    sm: 4,      // calc(var(--radius) - 4px)
    md: 6,      // calc(var(--radius) - 2px)
    lg: 8,      // var(--radius) = 0.5rem = 8px (MobileAppHeader.tsx#L60)
    xl: 12,     // rounded-xl (MobileAppHeader.tsx#L54, MobileDrawer.tsx#L114)
    "2xl": 16,  // rounded-2xl
    full: 9999, // rounded-full (MobileAppHeader.tsx#L87, L99)
  },

  // Typography font sizes & weights (web: Tailwind standard text sizes)
  typography: {
    xs: { fontSize: 12, lineHeight: 16 },
    sm: { fontSize: 14, lineHeight: 20 },
    base: { fontSize: 16, lineHeight: 24 },
    lg: { fontSize: 18, lineHeight: 28 },
    xl: { fontSize: 20, lineHeight: 28 },
    "2xl": { fontSize: 24, lineHeight: 32 },
    fontWeights: {
      normal: "400" as const,
      medium: "500" as const,
      semibold: "600" as const,
      bold: "700" as const,
      extrabold: "800" as const,
      black: "900" as const,
    },
  },

  // Persistence keys matching web exactly
  storageKeys: {
    theme: "ts_theme",                     // components/providers/ThemeProvider.tsx#L22
    goal: "trillion_selected_goal",        // components/providers/GoalProvider.tsx#L119
    subGoal: "trillion_selected_sub_goal", // components/providers/GoalProvider.tsx#L120
    contentLanguage: "ts_content_language",// components/layout/MobileAppHeader.tsx#L29
  },
} as const;
