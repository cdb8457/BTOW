// ─── BTOW Design Tokens — Glass Console Spatial ───────────────────────────────
// Import these for dynamic/inline styles. All static classes live in globals.css

export const colors = {
  // Core palette
  primary: '#f65af6',       // pink — chat accent, send button, active states
  primaryGlow: 'rgba(246, 90, 246, 0.25)',
  violetAccent: '#8b5cf6',  // UI chrome, buttons, dividers
  deepViolet: '#7b4bf7',    // auth/splash contexts
  limeAccent: '#d9f99d',    // presence, speaking ring, CTAs
  limeGlow: 'rgba(217, 249, 157, 0.3)',

  // Backgrounds
  bgDark: '#08080a',        // root background
  bgSurface: 'rgba(255,255,255,0.04)',   // glass slab fill
  bgSurfaceLit: 'rgba(255,255,255,0.07)', // hover/active glass
  bgSurfaceModal: 'rgba(12,12,18,0.92)',  // modal overlay

  // Text
  textBright: '#f8f8ff',
  textPrimary: '#c4c4d4',
  textMuted: '#6b6b80',
  textFaint: '#3a3a50',

  // Borders / strokes
  borderGlass: 'rgba(255,255,255,0.08)',
  borderGlassLit: 'rgba(255,255,255,0.15)',
  borderViolet: 'rgba(139,92,246,0.4)',
  borderLime: 'rgba(217,249,157,0.5)',

  // Status dots
  online: '#3ba55c',
  idle: '#faa61a',
  dnd: '#ed4245',
  offline: '#747f8d',

  // Danger
  danger: '#ed4245',
  dangerSurface: 'rgba(237,66,69,0.12)',
  dangerBorder: 'rgba(237,66,69,0.35)',
} as const;

export const shadows = {
  speakingRing: `0 0 0 3px ${colors.limeAccent}, 0 0 20px ${colors.limeGlow}`,
  inputDefault: '0 0 0 1px rgba(255,255,255,0.06) inset',
  inputFocus: `0 0 0 2px ${colors.violetAccent}`,
  ctaLime: `0 0 24px ${colors.limeGlow}, 0 4px 12px rgba(0,0,0,0.4)`,
  glassCard: '0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset',
  glassModal: '0 24px 64px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.08) inset',
  violet: `0 0 16px rgba(139,92,246,0.4)`,
} as const;

export const fonts = {
  display: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
} as const;

export const transitions = {
  fast: 'all 0.1s ease',
  base: 'all 0.15s ease',
  smooth: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;
