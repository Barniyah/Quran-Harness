/**
 * @deepseek-ai/dsh-quran-bundle — Portable Quran Harness preset registrar.
 *
 * Resolves relative plugin paths (`../<pkg>/lib/index.js`) inside the `quran`
 * preset declaration against this bundle package's own location (`import.meta.url`)
 * before registering the preset with `ctx.agentPresets`, making `cordis.patch.yml`
 * 100% portable across any machine, directory, or operating system.
 */
import type { Context } from '@deepseek-ai/cordis'

export interface PresetPluginRow {
  id?: string
  name: string
  group?: boolean
  config?: unknown
  disabled?: unknown
  isolate?: Record<string, boolean>
}

export interface QuranPresetConfig {
  id: string
  name?: string
  description?: string
  order?: number
  plugins: PresetPluginRow[]
}

const BUNDLE_ROOT = new URL('../', import.meta.url)

function resolveRelativePlugins(rows: readonly PresetPluginRow[]): PresetPluginRow[] {
  return rows.map((row) => {
    const resolvedName =
      typeof row.name === 'string' && (row.name.startsWith('./') || row.name.startsWith('../'))
        ? new URL(row.name, BUNDLE_ROOT).href
        : row.name
    const resolvedConfig =
      row.group === true && Array.isArray(row.config)
        ? resolveRelativePlugins(row.config as PresetPluginRow[])
        : row.config
    return {
      ...row,
      name: resolvedName,
      ...(resolvedConfig !== undefined ? { config: resolvedConfig } : {}),
    }
  })
}

export const name = 'preset-quran'
export const inject = ['agentPresets']

export function apply(ctx: Context, config: QuranPresetConfig): void {
  if (!config || !Array.isArray(config.plugins)) return
  const resolved: QuranPresetConfig = {
    ...config,
    plugins: resolveRelativePlugins(config.plugins),
  }
  const agentPresets = (
    ctx as unknown as {
      agentPresets: { register(def: QuranPresetConfig): Promise<() => Promise<void>> }
    }
  ).agentPresets
  let unregister: (() => Promise<void>) | undefined
  void agentPresets.register(resolved).then((dispose) => {
    unregister = dispose
  })
  ctx.effect(() => () => unregister?.(), 'quran-bundle.preset')
}

Object.assign(apply, {
  inject: ['agentPresets'],
  [Symbol.for('cordis.group')]: true,
})
