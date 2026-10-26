export const GOAL_CATEGORIES = [
  { id: "UPSC", label: "UPSC Civil Services", description: "IAS, IPS, IFS & Central Services" },
  { id: "SSC", label: "SSC / Banking Exams", description: "CGL, CHSL, CPO, IBPS PO & Clerk" },
  { id: "STATE_PSC", label: "State PSC Exams", description: "UPPSC, BPSC, MPPSC, RAS & State Services" },
  { id: "CODING_TECH", label: "Coding & Technology", description: "Full-Stack, DSA, System Design & Cloud" },
  { id: "DATA_AI", label: "Data Science & AI", description: "Machine Learning, Deep Learning, SQL & Python" },
  { id: "GENERAL_SKILLS", label: "Professional Skills", description: "English Communication, Aptitude & Reasoning" },
] as const;

export type GoalCategory = (typeof GOAL_CATEGORIES)[number]["id"];

export const APP_THEME = {
  primaryColor: "#1448d8",
  accentColor: "#1DB954",
  darkBg: "#05192D",
  darkCard: "#0B2545",
  lightBg: "#F8FAFC",
  lightCard: "#FFFFFF",
} as const;

export const DEFAULT_CONFIG = {
  minSupportedVersion: "1.0.0",
  latestVersion: "1.0.0",
  isMaintenance: false,
  maintenanceMessage: null,
  allowPurchases: false, // Reader App default: purchases happen on website
  googleAuthEnabled: false,
  otpAuthEnabled: false,
} as const;
