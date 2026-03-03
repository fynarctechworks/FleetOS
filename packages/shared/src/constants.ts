// FleetOS Design System Constants
// From CLAUDE.md — Design System section

export const COLORS = {
  primary: '#1A3C6E',
  accent: '#F97316',
  secondary: '#0EA5E9',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  bgLight: '#F8FAFC',
  textDark: '#1E293B',
  textMuted: '#64748B',
} as const;

export const FONTS = {
  web: 'Inter',
  hindi: 'Noto Sans Devanagari',
  telugu: 'Noto Sans Telugu',
} as const;

export const LIMITS = {
  minTapTarget: 48,
  minFontSize: 14,
  minScreenWidth: 360,
  maxImageSizeBytes: 2 * 1024 * 1024, // 2MB after compression
  podMaxSizeBytes: 500 * 1024, // 500KB after compression
  syncIntervalMs: 60_000, // 60 seconds
  gpsIntervalMs: 30_000, // 30 seconds
  locationRetentionDays: 90,
} as const;

export const GST_RATES = [0, 5, 12, 18, 28] as const;

export const SUPPORTED_LANGUAGES = ['en', 'hi', 'te'] as const;

export const WHATSAPP_COMMANDS = ['DEPART', 'ARRIVE', 'DONE'] as const;

export const COMPLIANCE_THRESHOLDS = {
  expiringSoonDays: 30,
  alertDays: [30, 15, 7] as const,
} as const;

export const DIESEL_THEFT_THRESHOLD = 0.15; // 15% mileage deviation
