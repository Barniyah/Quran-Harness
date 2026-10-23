// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import type { FunctionComponent } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import {
  apply,
  ARABIC_DICTIONARIES,
  ARABIC_LOCALE_ID,
  ARABIC_LOCALE_LABEL,
  createQuranAppearanceRowStore,
  inject,
  ISLAMIC_PATTERN_DATA_URI,
  MUSHAF_REHAL_DATA_URI,
  ORNAMENT_DIAMOND,
  ORNAMENT_FLORAL,
  ORNAMENT_HEADER,
  QURAN_THEME_PREFERENCES,
  QURAN_THEME_STORAGE_KEY,
  QuranAppearanceRow,
  type QuranAppearanceRowInjected,
  QuranMushafOverlay,
} from '../src/client/index.ts'
import { MUSHAF_DARK_TOKENS, MUSHAF_LIGHT_TOKENS } from '../src/client/themes.ts'

// Slot components receive host-injected props (slot/children/useStore) at runtime;
// tests pass them directly, so widen the static props type for test rendering only.
const asTestComponent = (component: unknown) => component as FunctionComponent<Record<string, unknown>>

interface FakeThemeDef {
  id: string
  colorScheme: string
  tokens: Record<string, string>
}

interface FakeSlotRegistration {
  name: string
  id?: string
  order?: number
  priority?: number
  store?: ReturnType<typeof createQuranAppearanceRowStore>
  inject?: (actions: { sync: (pref: string, rev: number) => void }) => unknown
  component: unknown
}

function makeCtx() {
  const themes: FakeThemeDef[] = []
  const effects: Array<() => void> = []
  const slotRegistrations: FakeSlotRegistration[] = []
  const listeners = new Map<string, Array<(payload: unknown) => void>>()
  const localeSubscribers = new Set<() => void>()
  const registeredLanguages: Array<{ id: string; label: string; fallback: string }> = [
    { id: 'zh', label: '中文', fallback: 'en' },
    { id: 'en', label: 'English', fallback: 'en' },
  ]
  const registeredDicts = new Map<string, Record<string, string>>()
  let activeLocale = 'en'
  let localeRevision = 0
  let currentPreference = 'system'
  let revision = 0

  const ctx = {
    theme: {
      register: vi.fn((def: FakeThemeDef) => {
        themes.push(def)
        return vi.fn()
      }),
      setTheme: vi.fn((id: string) => {
        currentPreference = id
        revision += 1
        const handlers = listeners.get('theme/change') ?? []
        for (const h of handlers) {
          h({ preference: currentPreference, revision })
        }
      }),
      getTheme: vi.fn(() => ({
        preference: currentPreference,
        revision,
      })),
    },
    slots: {
      inject: vi.fn((_slotName: string, effectFn: () => () => void) => {
        const dispose = effectFn()
        effects.push(dispose)
        return { dispose }
      }),
      register: vi.fn((options: Omit<FakeSlotRegistration, 'component'>, component: unknown) => {
        slotRegistrations.push({ ...options, component })
        return vi.fn()
      }),
    },
    locale: {
      getSnapshot: vi.fn(() => ({
        active: activeLocale,
        locales: [...registeredLanguages],
        revision: localeRevision,
      })),
      addLanguage: vi.fn((input: { id: string; label: string; fallback: string }) => {
        registeredLanguages.push(input)
        localeRevision += 1
        for (const sub of localeSubscribers) sub()
        return () => {
          const idx = registeredLanguages.indexOf(input)
          if (idx >= 0) registeredLanguages.splice(idx, 1)
        }
      }),
      register: vi.fn((ns: string, locale: string, dict: Record<string, string>) => {
        registeredDicts.set(`${ns}:${locale}`, dict)
        return () => { registeredDicts.delete(`${ns}:${locale}`) }
      }),
      subscribe: vi.fn((fn: () => void) => {
        localeSubscribers.add(fn)
        return () => { localeSubscribers.delete(fn) }
      }),
      setLocale: vi.fn((id: string) => {
        activeLocale = id
        localeRevision += 1
        for (const sub of localeSubscribers) sub()
      }),
    },
    on: vi.fn((event: string, listener: (payload: unknown) => void) => {
      const list = listeners.get(event) ?? []
      list.push(listener)
      listeners.set(event, list)
      return vi.fn()
    }),
    effect: vi.fn((execute: () => () => void, _label?: string) => {
      effects.push(execute())
      return { dispose: vi.fn() }
    }),
    emitThemeChange: (preference: string) => {
      currentPreference = preference
      revision += 1
      const handlers = listeners.get('theme/change') ?? []
      for (const h of handlers) {
        h({ preference: currentPreference, revision })
      }
    },
  }
  return {
    ctx: ctx as unknown as ClientContext,
    rawCtx: ctx,
    themes,
    effects,
    slotRegistrations,
    registeredLanguages,
    registeredDicts,
  }
}

describe('quran islamic theme & arabic locale plugin', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.documentElement.dir = 'ltr'
    delete document.documentElement.dataset.rtl
    document.body.dir = 'ltr'
    delete document.body.dataset.rtl
    delete document.body.dataset.quranTheme
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('registers the mushaf light and dark themes with token overrides and activates mushaf by default', () => {
    expect(inject).toEqual(['theme', 'slots', 'locale'])
    const { ctx, rawCtx, themes } = makeCtx()
    apply(ctx)
    expect(themes.map(t => t.id)).toEqual(['mushaf', 'mushaf-dark'])
    expect(themes[0]?.colorScheme).toBe('light')
    expect(themes[1]?.colorScheme).toBe('dark')
    expect(themes[0]?.tokens).toEqual(MUSHAF_LIGHT_TOKENS)
    expect(themes[1]?.tokens).toEqual(MUSHAF_DARK_TOKENS)
    expect(rawCtx.theme.setTheme).toHaveBeenCalledWith('mushaf')
    expect(document.body.dataset.quranTheme).toBe('mushaf')
  })

  it('registers QuranAppearanceRow in settings.general.item and QuranMushafOverlay in shell.overlay', () => {
    const { ctx, slotRegistrations } = makeCtx()
    apply(ctx)
    expect(slotRegistrations).toHaveLength(2)

    const appearanceReg = slotRegistrations.find(r => r.name === 'settings.general.item')!
    expect(appearanceReg.id).toBe('appearance')
    expect(appearanceReg.order).toBe(10)
    expect(appearanceReg.priority).toBe(-10)
    expect(appearanceReg.component).toBe(QuranAppearanceRow)

    const overlayReg = slotRegistrations.find(r => r.name === 'shell.overlay')!
    expect(overlayReg.id).toBe('quran-mushaf-decor')
    expect(overlayReg.order).toBe(5)
    expect(overlayReg.component).toBe(QuranMushafOverlay)
  })

  it('persists selected theme to localStorage, syncs data-quran-theme, and protects mushaf/mushaf-dark from Host adopt() resets', () => {
    const { ctx, rawCtx, slotRegistrations } = makeCtx()
    apply(ctx)
    const reg = slotRegistrations.find(r => r.name === 'settings.general.item')!
    const syncSpy = vi.fn()
    const injected = reg.inject!({ sync: syncSpy }) as QuranAppearanceRowInjected

    // Select mushaf-dark from the settings row
    injected.setTheme('mushaf-dark')
    expect(localStorage.getItem(QURAN_THEME_STORAGE_KEY)).toBe('mushaf-dark')
    expect(rawCtx.theme.setTheme).toHaveBeenLastCalledWith('mushaf-dark')
    expect(document.body.dataset.quranTheme).toBe('mushaf-dark')

    // Simulate Host settings adopt() resetting preference to 'system'
    rawCtx.emitThemeChange('system')
    expect(rawCtx.theme.setTheme).toHaveBeenLastCalledWith('mushaf-dark')

    // Select built-in dark theme from the settings row
    injected.setTheme('dark')
    expect(localStorage.getItem(QURAN_THEME_STORAGE_KEY)).toBe('dark')
    expect(rawCtx.theme.setTheme).toHaveBeenLastCalledWith('dark')
    expect(document.body.dataset.quranTheme).toBeUndefined()
  })

  it('renders QuranMushafOverlay with Islamic pattern, Mushaf-on-Rehal watermark, and ASCII ornaments for mushaf themes only', () => {
    let activePref: (typeof QURAN_THEME_PREFERENCES)[number] = 'mushaf'
    const useStore = <T>(selector: (s: { preference: typeof activePref; revision: number }) => T): T =>
      selector({ preference: activePref, revision: 1 })

    const { rerender } = render(
      createElement(asTestComponent(QuranMushafOverlay), {
        slot: 'shell.overlay',
        children: {},
        useStore,
      }),
    )

    const overlay = screen.getByTestId('quran-mushaf-overlay')
    expect(overlay.getAttribute('data-theme-mode')).toBe('mushaf')
    expect(screen.getByTestId('quran-ornament-header').textContent).toContain(ORNAMENT_HEADER)
    expect(screen.getByTestId('quran-ornament-header').textContent).toContain(ORNAMENT_DIAMOND)
    expect(screen.getByTestId('quran-ornament-footer').textContent).toContain(ORNAMENT_FLORAL)
    expect(ISLAMIC_PATTERN_DATA_URI).toMatch(/^data:image\/jpeg;base64,/)
    expect(MUSHAF_REHAL_DATA_URI).toMatch(/^data:image\/png;base64,/)

    // Switch to standard 'light' theme -> overlay hides
    activePref = 'light'
    rerender(
      createElement(asTestComponent(QuranMushafOverlay), {
        slot: 'shell.overlay',
        children: {},
        useStore,
      }),
    )
    expect(screen.queryByTestId('quran-mushaf-overlay')).toBeNull()
  })

  it('registers Arabic (ar — العربية) in ctx.locale and toggles RTL document direction when Arabic is active', () => {
    const { ctx, rawCtx, registeredLanguages, registeredDicts } = makeCtx()
    apply(ctx)

    // Verify Arabic is added to the language catalog
    const arLang = registeredLanguages.find(l => l.id === ARABIC_LOCALE_ID)
    expect(arLang).toEqual({
      id: 'ar',
      label: ARABIC_LOCALE_LABEL,
      fallback: 'en',
    })

    // Verify Arabic dictionaries are registered for core namespaces
    for (const ns of Object.keys(ARABIC_DICTIONARIES)) {
      expect(registeredDicts.has(`${ns}:ar`)).toBe(true)
    }
    expect(registeredDicts.get('settings:ar')?.['general.nav']).toBe('الإعدادات العامة')
    expect(registeredDicts.get('sidebar:ar')?.['session.new']).toBe('جلسة جديدة')

    // Initially 'en' -> LTR
    expect(document.documentElement.dir).toBe('ltr')
    expect(document.documentElement.dataset.rtl).toBeUndefined()

    // Switch to 'ar' -> RTL
    rawCtx.locale.setLocale('ar')
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.dataset.rtl).toBe('true')
    expect(document.body.dir).toBe('rtl')
    expect(document.body.dataset.rtl).toBe('true')

    // Switch back to 'en' -> LTR
    rawCtx.locale.setLocale('en')
    expect(document.documentElement.dir).toBe('ltr')
    expect(document.documentElement.dataset.rtl).toBeUndefined()
    expect(document.body.dir).toBe('ltr')
  })

  it('renders all 5 theme options in QuranAppearanceRow with Mushaf icons and switches preference on click', () => {
    const setTheme = vi.fn()
    let activePref: (typeof QURAN_THEME_PREFERENCES)[number] = 'mushaf'
    const useStore = <T>(selector: (s: { preference: typeof activePref; revision: number }) => T): T =>
      selector({ preference: activePref, revision: 1 })

    const { rerender } = render(
      createElement(asTestComponent(QuranAppearanceRow), {
        slot: 'settings.general.item',
        children: {},
        useStore,
        setTheme,
      }),
    )

    for (const id of QURAN_THEME_PREFERENCES) {
      const btn = document.querySelector<HTMLButtonElement>(`button[data-theme-id="${id}"]`)
      expect(btn).not.toBeNull()
      expect(btn!.getAttribute('aria-pressed')).toBe(id === 'mushaf' ? 'true' : 'false')
    }

    expect(screen.getByText('مصحف نهاري')).toBeTruthy()
    expect(screen.getByText('مصحف ليلي')).toBeTruthy()

    const mushafDarkBtn = document.querySelector<HTMLButtonElement>('button[data-theme-id="mushaf-dark"]')!
    fireEvent.click(mushafDarkBtn)
    expect(setTheme).toHaveBeenCalledWith('mushaf-dark')

    activePref = 'mushaf-dark'
    rerender(
      createElement(asTestComponent(QuranAppearanceRow), {
        slot: 'settings.general.item',
        children: {},
        useStore,
        setTheme,
      }),
    )
    expect(mushafDarkBtn.getAttribute('aria-pressed')).toBe('true')
  })

  it('defines the mushaf identity colors', () => {
    expect(MUSHAF_LIGHT_TOKENS['--dsw-alias-brand-primary']).toBe('#14663F')
    expect(MUSHAF_LIGHT_TOKENS['--dsw-alias-bg-base']).toBe('#FBF7EC')
    expect(MUSHAF_DARK_TOKENS['--dsw-alias-brand-primary']).toBe('#D4AF37')
    expect(MUSHAF_DARK_TOKENS['--dsw-alias-bg-base']).toBe('#0E1B16')
  })

  it('mounts the global stylesheet with the plugin tag', () => {
    const { ctx } = makeCtx()
    apply(ctx)
    const tag = document.head.querySelector<HTMLStyleElement>('style[data-plugin="@deepseek-ai/dsh-client-ui-quran-theme"]')
    expect(tag).not.toBeNull()
    expect(tag!.dataset.pluginCss).toBe('@deepseek-ai/dsh-client-ui-quran-theme/global.css')
  })
})

describe('global.css source', () => {
  const css = readFileSync('packages/quran/client-theme-islamic/src/client/global.css', 'utf8')

  it('carries the Arabic-first font stacks, Quran text rules, and RTL rules', () => {
    expect(css).toContain('--qh-font-quran')
    expect(css).toContain('IBM Plex Sans Arabic')
    expect(css).toContain('[data-quran-text]')
    expect(css).toContain('direction: rtl')
    expect(css).toContain('html[dir="rtl"]')
  })

  it('carries the girih/khatam backdrop for both color schemes', () => {
    expect(css.match(/data:image\/svg\+xml/g)?.length).toBe(2)
    expect(css).toContain('body[data-ds-dark-theme]::before')
  })
})
