// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import {
  apply,
  createQuranAppearanceRowStore,
  inject,
  QURAN_THEME_PREFERENCES,
  QURAN_THEME_STORAGE_KEY,
  QuranAppearanceRow,
  type QuranAppearanceRowInjected,
} from '../src/client/index.ts'
import { MUSHAF_DARK_TOKENS, MUSHAF_LIGHT_TOKENS } from '../src/client/themes.ts'

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
  inject?: (actions: { sync: (pref: string, rev: number) => void }) => QuranAppearanceRowInjected
  component: unknown
}

function makeCtx() {
  const themes: FakeThemeDef[] = []
  const effects: Array<() => void> = []
  const slotRegistrations: FakeSlotRegistration[] = []
  const listeners = new Map<string, Array<(payload: unknown) => void>>()
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
  }
}

describe('quran islamic theme plugin', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('registers the mushaf light and dark themes with token overrides and activates mushaf by default', () => {
    expect(inject).toEqual(['theme', 'slots'])
    const { ctx, rawCtx, themes } = makeCtx()
    apply(ctx)
    expect(themes.map(t => t.id)).toEqual(['mushaf', 'mushaf-dark'])
    expect(themes[0]?.colorScheme).toBe('light')
    expect(themes[1]?.colorScheme).toBe('dark')
    expect(themes[0]?.tokens).toEqual(MUSHAF_LIGHT_TOKENS)
    expect(themes[1]?.tokens).toEqual(MUSHAF_DARK_TOKENS)
    expect(rawCtx.theme.setTheme).toHaveBeenCalledWith('mushaf')
  })

  it('shadows the appearance row in settings.general.item with priority -10', () => {
    const { ctx, slotRegistrations } = makeCtx()
    apply(ctx)
    expect(slotRegistrations).toHaveLength(1)
    const reg = slotRegistrations[0]!
    expect(reg.name).toBe('settings.general.item')
    expect(reg.id).toBe('appearance')
    expect(reg.order).toBe(10)
    expect(reg.priority).toBe(-10)
    expect(reg.component).toBe(QuranAppearanceRow)
  })

  it('persists selected theme to localStorage and protects mushaf/mushaf-dark from Host adopt() resets', () => {
    const { ctx, rawCtx, slotRegistrations } = makeCtx()
    apply(ctx)
    const reg = slotRegistrations[0]!
    const syncSpy = vi.fn()
    const injected = reg.inject!({ sync: syncSpy })

    // Select mushaf-dark from the settings row
    injected.setTheme('mushaf-dark')
    expect(localStorage.getItem(QURAN_THEME_STORAGE_KEY)).toBe('mushaf-dark')
    expect(rawCtx.theme.setTheme).toHaveBeenLastCalledWith('mushaf-dark')

    // Simulate Host settings adopt() resetting preference to 'system'
    rawCtx.emitThemeChange('system')
    expect(rawCtx.theme.setTheme).toHaveBeenLastCalledWith('mushaf-dark')

    // Select built-in dark theme from the settings row
    injected.setTheme('dark')
    expect(localStorage.getItem(QURAN_THEME_STORAGE_KEY)).toBe('dark')
    expect(rawCtx.theme.setTheme).toHaveBeenLastCalledWith('dark')
  })

  it('renders all 5 theme options in QuranAppearanceRow and switches preference on click', () => {
    const setTheme = vi.fn()
    let activePref: (typeof QURAN_THEME_PREFERENCES)[number] = 'mushaf'
    const useStore = <T>(selector: (s: { preference: typeof activePref; revision: number }) => T): T =>
      selector({ preference: activePref, revision: 1 })

    const { rerender } = render(
      createElement(QuranAppearanceRow, {
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
      createElement(QuranAppearanceRow, {
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

  it('mounts the global stylesheet with the plugin tag (vitest returns empty ?inline CSS; content is checked in the source test below)', () => {
    const { ctx } = makeCtx()
    apply(ctx)
    const tag = document.head.querySelector<HTMLStyleElement>('style[data-plugin="@deepseek-ai/dsh-client-ui-quran-theme"]')
    expect(tag).not.toBeNull()
    expect(tag!.dataset.pluginCss).toBe('@deepseek-ai/dsh-client-ui-quran-theme/global.css')
  })
})

describe('global.css source', () => {
  const css = readFileSync('packages/quran/client-theme-islamic/src/client/global.css', 'utf8')

  it('carries the Arabic-first font stacks and the Quran text rules', () => {
    expect(css).toContain('--qh-font-quran')
    expect(css).toContain('IBM Plex Sans Arabic')
    expect(css).toContain('[data-quran-text]')
    expect(css).toContain('direction: rtl')
  })

  it('carries the girih backdrop for both color schemes', () => {
    expect(css.match(/data:image\/svg\+xml/g)?.length).toBe(2)
    expect(css).toContain('body[data-ds-dark-theme]::before')
  })
})
