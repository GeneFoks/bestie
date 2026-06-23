// ── Bestie design tokens — single source of truth ───────────────────────────
// Use these in component inline styles instead of hardcoding hex values, so the
// palette stays consistent everywhere. Mirrors the CSS variables in
// app/globals.css. When a value changes, change it here (and the matching CSS
// var) — not in dozens of components.

export const colors = {
  bg:          '#09090F',
  surface1:    '#111120',  // canonical card surface (was also #131323 / #0F0F1E)
  surface2:    '#161628',
  surface3:    '#1A1A2E',
  border:      'rgba(255,255,255,0.10)',
  borderGold:  'rgba(212,175,55,0.30)',
  textPrimary: '#F0EAFF',  // canonical (was also #E8E0FF)
  textMuted:   '#A99ECC',  // canonical (was also #9B93C0)
  textDim:     '#8B82B0',  // lightened from #6B6280 for AA contrast
  gold:        '#D4AF37',
  goldDark:    '#B8960C',
  purple:      '#9B7FFF',
  green:       '#34D399',  // canonical (replaces neon #39FF14)
  coral:       '#FF7857',  // canonical accent (was also #FF6B35)
  blue:        '#60A5FA',
  danger:      '#FF6B6B',
} as const

export const radius = { sm: '8px', md: '12px', lg: '14px', xl: '18px', pill: '999px' } as const

// Type scale (px) — keep font sizes on these steps instead of ad-hoc values.
export const fontSize = { xs: '12px', sm: '13px', base: '15px', lg: '18px', xl: '24px', xxl: '34px' } as const

export const font = {
  serif: "'DM Serif Display', serif",
  sans:  "'Plus Jakarta Sans', sans-serif",
} as const

// The one place the gold gradient is defined — reserve it for a single primary
// action per screen.
export const goldGradient = 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)'
