/**
 * Governance card plugin, browser half: owns the keyed toolviews for the Quran
 * tools (`quran_get_verse`, `quran_get_metadata`). Every Quran data result
 * renders as the mandatory governance card — source, SHA-256 digest, retrieval
 * timestamp and the two-source cross-verification verdict — derived only from
 * the durable call/result slice, so session replay reproduces it exactly.
 *
 * The card is bilingual by design (Arabic primary, English secondary) and does
 * not consume the locale service, which currently ships zh/en only.
 *
 * @module @deepseek-ai/dsh-client-ui-quran-governance
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the SlotRegistry service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import { GovernanceCard } from './GovernanceCard.tsx'

/**
 * Client plugin body: register the two keyed tool rows.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('tool.call.toolview', () => {
    const disposers = ['quran_get_verse', 'quran_get_metadata', 'quran_search', 'quran_get_audio', 'quran_get_page_image', 'quran_get_ayah_image']
      .map(key => ctx.slots.register({ name: 'tool.call.toolview', key }, GovernanceCard))
    return () => { for (const dispose of disposers) dispose() }
  })
}
