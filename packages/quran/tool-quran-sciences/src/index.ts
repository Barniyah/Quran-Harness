/**
 * Quran sciences tool (v1): thematic topic search over the pinned Quranpedia
 * catalog — 6100 topics, 4574 carrying verse references. Offline, integrity-
 * checked at load, evidence-enveloped.
 *
 * Honest scope: asbab al-nuzul and gharib al-Quran are NOT in this version —
 * the SurahApp API docs were unreachable/misconfigured on 2026-10-20 (see
 * PROGRESS.md); they land when a pinnable source clears verification.
 *
 * @module @deepseek-ai/dsh-tool-quran-sciences
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { appendAuditLog, createEnvelope } from '@deepseek-ai/dsh-quran-evidence'
import { loadTopics, QURANPEDIA_TOPICS, searchTopics } from '@deepseek-ai/dsh-quran-data'
import type { QuranTopic } from '@deepseek-ai/dsh-quran-data'

export const name = 'tool-quran-sciences'
export const inject = ['tools']

/** Plugin configuration. */
export interface Config {
  /** Path of the append-only audit log. Defaults to `evidence-audit.jsonl` in the working directory. */
  auditLogPath?: string
}

export function apply(ctx: Context, config: Config = {}) {
  const auditLogPath = config.auditLogPath ?? 'evidence-audit.jsonl'

  ctx.tools.register(defineTool({
    name: 'quran_search_topics',
    description: 'Search the Quran thematic index (Quranpedia catalog, 6100 topics) by Arabic topic name; matching topics come with their verse references (e.g. 7:26). Offline over a pinned, integrity-checked catalog. Always show the governance card.',
    parameters: {
      query: { type: 'string', required: true, description: 'Arabic topic text, e.g. الصلاة or الريش' },
      limit: { type: 'number', description: 'Max topics returned, default 20, cap 50' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          query: { type: 'string', required: true },
          topics: { type: 'array', required: true },
          evidence: { type: 'object', additionalProperties: true, required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => {
        const topics = value.topics as unknown as QuranTopic[]
        const lines = topics.map(t => `${t.name} — ${t.ayahs || '(لا مراجع آيات)'}`)
        return [{
          type: 'text' as const,
          text: [`موضوعات "${value.query}":`, ...lines, '', '[Governance card] source: Quranpedia topics (pinned) | envelope in metadata'].join('\n'),
        }]
      },
      presentationMeta: (_args, value) => ({
        status: 'ok',
        source: QURANPEDIA_TOPICS.id,
        count: (value.topics as unknown[]).length,
      }),
    },
    async execute(args) {
      const { query } = args
      const limit = Math.min(Math.max(args.limit ?? 20, 1), 50)
      if (typeof query !== 'string' || query.trim() === '') throw new Error('query must be a non-empty string')
      const topics = await loadTopics()
      const matched = searchTopics(topics, query, limit)

      const evidence = createEnvelope({ query, matched }, QURANPEDIA_TOPICS)
      await appendAuditLog(auditLogPath, {
        at: new Date().toISOString(),
        operation: 'quran_search_topics',
        envelopes: [{ source: evidence.source.id, contentHash: evidence.contentHash }],
      })
      return {
        query,
        topics: JSON.parse(JSON.stringify(matched)),
        evidence: JSON.parse(JSON.stringify(evidence)),
      }
    },
  }))
}
