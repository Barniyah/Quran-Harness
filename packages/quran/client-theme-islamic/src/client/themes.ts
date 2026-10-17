/**
 * Token definitions for the mushaf themes. Values are literal CSS colors so
 * the themes stay self-contained and do not depend on the base palette's
 * internal static scale.
 */

/** Alias-token overrides for the light mushaf theme (ivory / deep green / gold). */
export const MUSHAF_LIGHT_TOKENS = {
  '--dsw-alias-bg-base': '#FBF7EC',
  '--dsw-alias-bg-layer-1': '#F7F1E0',
  '--dsw-alias-bg-layer-2': '#F1E9D3',
  '--dsw-alias-bg-overlay': '#F3ECDA',
  '--dsw-alias-border-l1': 'rgba(29, 111, 74, 0.10)',
  '--dsw-alias-border-l2': 'rgba(29, 111, 74, 0.22)',
  '--dsw-alias-brand-primary': '#14663F',
  '--dsw-alias-label-primary': '#26312B',
  '--dsw-alias-label-secondary': '#5A6B60',
  '--dsw-alias-state-success-primary': '#1D8A54',
  '--dsw-alias-state-error-primary': '#B03030',
  '--dsw-alias-state-warn-primary': '#9C7A1F',
  '--dsw-alias-state-idle-primary': '#7A8A7E',
  '--dsw-specific-sidebar-fill': '#F3ECDA',
} as const

/** Alias-token overrides for the dark mushaf theme (deep green-black / gold / ivory text). */
export const MUSHAF_DARK_TOKENS = {
  '--dsw-alias-bg-base': '#0E1B16',
  '--dsw-alias-bg-layer-1': '#14251E',
  '--dsw-alias-bg-layer-2': '#1A2F26',
  '--dsw-alias-bg-overlay': '#1A2F26',
  '--dsw-alias-border-l1': 'rgba(212, 175, 55, 0.12)',
  '--dsw-alias-border-l2': 'rgba(212, 175, 55, 0.24)',
  '--dsw-alias-brand-primary': '#D4AF37',
  '--dsw-alias-label-primary': '#EDE4C8',
  '--dsw-alias-label-secondary': '#A8B5A3',
  '--dsw-alias-state-success-primary': '#3FB27F',
  '--dsw-alias-state-error-primary': '#E06C5C',
  '--dsw-alias-state-warn-primary': '#D4AF37',
  '--dsw-alias-state-idle-primary': '#5F7266',
  '--dsw-specific-sidebar-fill': '#12221B',
} as const
