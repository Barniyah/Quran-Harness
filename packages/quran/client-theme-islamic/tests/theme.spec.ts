// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { apply } from '../src/client/index.ts'
import { MUSHAF_DARK_TOKENS, MUSHAF_LIGHT_TOKENS } from '../src/client/themes.ts'

interface FakeThemeDef { id: string; colorScheme: string; tokens: Record<string, string> }

function makeCtx() {
  const themes: FakeThemeDef[] = []
  const effects: Array<() => void> = []
  const ctx = {
    theme: {
      register: vi.fn((def: FakeThemeDef) => {
        themes.push(def)
        return vi.fn()
      }),
    },
    effect: vi.fn((execute: () => (() => void), _label?: string) => {
      effects.push(execute())
      return { dispose: vi.fn() }
    }),
  }
  return { ctx: ctx as unknown as ClientContext, themes, effects }
}

describe('quran islamic theme plugin', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it('registers the mushaf light and dark themes with token overrides', () => {
    const { ctx, themes } = makeCtx()
    apply(ctx)
    expect(themes.map(t => t.id)).toEqual(['mushaf', 'mushaf-dark'])
    expect(themes[0].colorScheme).toBe('light')
    expect(themes[1].colorScheme).toBe('dark')
    expect(themes[0].tokens).toEqual(MUSHAF_LIGHT_TOKENS)
    expect(themes[1].tokens).toEqual(MUSHAF_DARK_TOKENS)
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
    const tag = document.head.querySelector('style[data-plugin="@deepseek-ai/dsh-client-ui-quran-theme"]')
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
