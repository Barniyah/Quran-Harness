/**
 * Quran Appearance row slot store: mirrors the active theme preference
 * (including `mushaf` and `mushaf-dark`) from the theme service snapshot.
 */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'

/** All selectable theme preferences in the Quran Harness Appearance settings row. */
export type QuranThemePreference = 'mushaf' | 'mushaf-dark' | 'light' | 'dark' | 'system'

/** Valid preference values supported by the Quran Appearance selector. */
export const QURAN_THEME_PREFERENCES: readonly QuranThemePreference[] = Object.freeze([
  'mushaf',
  'mushaf-dark',
  'light',
  'dark',
  'system',
])

/** Type guard for {@link QuranThemePreference}. */
export function isQuranThemePreference(value: unknown): value is QuranThemePreference {
  return typeof value === 'string' && (QURAN_THEME_PREFERENCES as readonly string[]).includes(value)
}

/** Store state mirrored from the theme snapshot. */
export interface QuranAppearanceRowState {
  /** Selected preference (`mushaf`, `mushaf-dark`, `light`, `dark`, or `system`). */
  preference: QuranThemePreference
  /** Monotonic revision counter so stale syncs are ignored. */
  revision: number
}

/** Declared action shape giving the exported factory a stable return type. */
export type QuranAppearanceRowActions = {
  sync: (draft: QuranAppearanceRowState, preference: QuranThemePreference, revision: number) => void
}

/**
 * Declares the Quran Appearance row state and write surface.
 * @returns the store handle.
 */
export function createQuranAppearanceRowStore(): EngineStoreHandle<QuranAppearanceRowState, QuranAppearanceRowActions> {
  return defineStore({
    init: (): QuranAppearanceRowState => ({ preference: 'mushaf', revision: -1 }),
    actions: {
      sync: (d, preference: QuranThemePreference, revision: number) => {
        if (revision <= d.revision && d.preference === preference) return
        d.preference = preference
        d.revision = Math.max(d.revision + 1, revision)
      },
    },
  })
}
