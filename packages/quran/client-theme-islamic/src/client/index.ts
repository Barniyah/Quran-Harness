/**
 * Islamic theme & Arabic locale plugin, browser half:
 * 1. Registers `mushaf` and `mushaf-dark` themes through `ctx.theme`
 * 2. Shadows the `appearance` row in `settings.general.item` so all 5 themes
 *    (`mushaf`, `mushaf-dark`, `light`, `dark`, `system`) appear in Settings
 * 3. Registers `QuranMushafOverlay` into `shell.overlay` (`id: 'quran-mushaf-decor'`)
 *    rendering the Islamic Khatam/Arabesque pattern backdrop, Open Mushaf on
 *    Carved Rehal watermark, and ASCII/Unicode ornamental borders
 * 4. Registers Arabic (`ar` — `العربية`) into `ctx.locale` with full RTL
 *    (`dir="rtl"`) synchronization and Arabic UI dictionaries
 *
 * @module @deepseek-ai/dsh-client-ui-quran-theme
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the LocaleRuntime service merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the shell.overlay SlotMap merge.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
// Type-only: pulls the SlotRegistry service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the settings.general.item SlotMap merge.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the ThemeRuntime service merge (ctx.theme).
import type { ThemeSnapshot } from '@deepseek-ai/dsh-client-ui-theme/client'
import { installArabicLocale } from './arabic-locale.ts'
import type { QuranAppearanceRowInjected } from './QuranAppearanceRow.tsx'
import { QuranAppearanceRow } from './QuranAppearanceRow.tsx'
import { QuranMushafOverlay } from './QuranMushafOverlay.tsx'
import {
  createQuranAppearanceRowStore,
  isQuranThemePreference,
  type QuranThemePreference,
} from './settings-store.ts'
import { MUSHAF_DARK_TOKENS, MUSHAF_LIGHT_TOKENS } from './themes.ts'
import globalCss from './global.css?inline'

export {
  ARABIC_DICTIONARIES,
  ARABIC_LOCALE_ID,
  ARABIC_LOCALE_LABEL,
  installArabicLocale,
  syncDocumentDirection,
} from './arabic-locale.ts'
export {
  ISLAMIC_PATTERN_DATA_URI,
  MUSHAF_REHAL_DATA_URI,
  ORNAMENT_DIAMOND,
  ORNAMENT_FLORAL,
  ORNAMENT_HEADER,
} from './islamic-assets.ts'
export type { QuranAppearanceRowComponentProps, QuranAppearanceRowInjected } from './QuranAppearanceRow.tsx'
export { QuranAppearanceRow } from './QuranAppearanceRow.tsx'
export type { QuranMushafOverlayProps } from './QuranMushafOverlay.tsx'
export { QuranMushafOverlay } from './QuranMushafOverlay.tsx'
export {
  createQuranAppearanceRowStore,
  isQuranThemePreference,
  QURAN_THEME_PREFERENCES,
  type QuranAppearanceRowActions,
  type QuranAppearanceRowState,
  type QuranThemePreference,
} from './settings-store.ts'

const PLUGIN_ID = '@deepseek-ai/dsh-client-ui-quran-theme'

/** Browser localStorage key persisting the selected Quran Harness theme preference. */
export const QURAN_THEME_STORAGE_KEY = 'dsh.quran.theme'

function readPersistedPreference(): QuranThemePreference {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(QURAN_THEME_STORAGE_KEY)
      if (isQuranThemePreference(stored)) return stored
    }
  } catch {
    // Ignore storage access errors in restricted/non-browser environments.
  }
  return 'mushaf'
}

function writePersistedPreference(id: QuranThemePreference): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(QURAN_THEME_STORAGE_KEY, id)
    }
  } catch {
    // Ignore storage access errors in restricted/non-browser environments.
  }
}

function syncBodyThemeAttribute(preference: QuranThemePreference): void {
  if (typeof document === 'undefined' || document.body === null) return
  if (preference === 'mushaf' || preference === 'mushaf-dark') {
    document.body.dataset.quranTheme = preference
  } else {
    delete document.body.dataset.quranTheme
  }
}

/** Required services: browser theme runtime (`ctx.theme`), UI slot registry (`ctx.slots`), and locale service (`ctx.locale`). */
export const inject = ['theme', 'slots', 'locale']

/**
 * Client plugin body: register the two mushaf themes, shadow the Appearance
 * settings row in `settings.general.item`, register the Islamic visual overlay
 * in `shell.overlay`, install Arabic (`ar`) + RTL support in `ctx.locale`, and
 * mount the global stylesheet.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const disposeLight = ctx.theme.register({
    id: 'mushaf',
    colorScheme: 'light',
    tokens: MUSHAF_LIGHT_TOKENS,
  })
  const disposeDark = ctx.theme.register({
    id: 'mushaf-dark',
    colorScheme: 'dark',
    tokens: MUSHAF_DARK_TOKENS,
  })

  let desiredPreference: QuranThemePreference = readPersistedPreference()
  syncBodyThemeAttribute(desiredPreference)
  ctx.theme.setTheme?.(desiredPreference)

  const store = createQuranAppearanceRowStore()
  let bound: BoundActions<typeof store> | undefined
  const overlayStore = createQuranAppearanceRowStore()
  let overlayBound: BoundActions<typeof overlayStore> | undefined
  let reapplying = false

  const syncStore = (preference: QuranThemePreference, revision: number): void => {
    syncBodyThemeAttribute(preference)
    bound?.sync(preference, revision)
    overlayBound?.sync(preference, revision)
  }

  const selectTheme = (id: QuranThemePreference): void => {
    desiredPreference = id
    writePersistedPreference(id)
    ctx.theme.setTheme?.(id)
    const snap = ctx.theme.getTheme?.()
    syncStore(id, snap?.revision ?? 0)
  }

  ctx.on?.('theme/change', (snapshot: ThemeSnapshot) => {
    const snapPref = snapshot.preference as string
    if (snapPref === 'mushaf' || snapPref === 'mushaf-dark') {
      desiredPreference = snapPref
      writePersistedPreference(snapPref)
      syncStore(snapPref, snapshot.revision)
      return
    }
    // When ThemeRuntime.adopt() receives the Host `ui-theme` section (whose schema
    // only allows 'light' | 'dark' | 'system'), it overwrites `preference` with
    // `section.preference`. If the user's desired preference is `mushaf` or
    // `mushaf-dark`, re-apply it so the Islamic theme stays active.
    if (!reapplying && (desiredPreference === 'mushaf' || desiredPreference === 'mushaf-dark') && snapPref !== desiredPreference) {
      reapplying = true
      try {
        ctx.theme.setTheme?.(desiredPreference)
      } finally {
        reapplying = false
      }
      return
    }
    if (isQuranThemePreference(snapPref)) {
      syncStore(snapPref, snapshot.revision)
    }
  })

  const injected = (actions: BoundActions<typeof store>): QuranAppearanceRowInjected => {
    bound = actions
    const snap = ctx.theme.getTheme?.()
    const currentPref = isQuranThemePreference(snap?.preference) ? snap.preference : desiredPreference
    syncStore(currentPref, snap?.revision ?? 0)
    return {
      setTheme: selectTheme,
    }
  }

  ctx.slots?.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'appearance',
    order: 10,
    priority: -10,
    store,
    inject: injected,
  }, QuranAppearanceRow))

  ctx.slots?.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'quran-mushaf-decor',
    order: 5,
    store: overlayStore,
    inject: (actions: BoundActions<typeof overlayStore>) => {
      overlayBound = actions
      const snap = ctx.theme.getTheme?.()
      const currentPref = isQuranThemePreference(snap?.preference) ? snap.preference : desiredPreference
      overlayBound.sync(currentPref, snap?.revision ?? 0)
      return {}
    },
  }, QuranMushafOverlay))

  if (ctx.locale !== undefined) {
    ctx.effect(() => installArabicLocale(ctx.locale), 'quran-theme: arabic locale & RTL')
  }

  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {}
    const tag = document.createElement('style')
    tag.dataset.plugin = PLUGIN_ID
    tag.dataset.pluginCss = `${PLUGIN_ID}/global.css`
    tag.textContent = globalCss
    document.head.appendChild(tag)
    return () => { tag.remove() }
  }, 'quran-theme: global stylesheet')

  ctx.effect(() => () => {
    if (typeof document !== 'undefined' && document.body !== null) {
      delete document.body.dataset.quranTheme
    }
    disposeLight()
    disposeDark()
  }, 'quran-theme: unregister themes')
}
