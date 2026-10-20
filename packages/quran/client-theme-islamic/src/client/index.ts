/**
 * Islamic theme plugin, browser half: registers the `mushaf` and
 * `mushaf-dark` themes through the theme runtime (alias-token overrides over
 * the built-in palettes) and mounts one additive global stylesheet carrying
 * the Arabic-first font stacks, the faint girih backdrop, and mushaf reading
 * niceties. Disposing the plugin removes both the themes and the sheet.
 *
 * @module @deepseek-ai/dsh-client-ui-quran-theme
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the ThemeRuntime service merge (ctx.theme).
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import { MUSHAF_DARK_TOKENS, MUSHAF_LIGHT_TOKENS } from './themes.ts'
import globalCss from './global.css?inline'

const PLUGIN_ID = '@deepseek-ai/dsh-client-ui-quran-theme'

/** Required service: browser theme runtime (`ctx.theme`). */
export const inject = ['theme']

/**
 * Client plugin body: register the two mushaf themes and the global sheet.
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
    disposeLight()
    disposeDark()
  }, 'quran-theme: unregister themes')
}
