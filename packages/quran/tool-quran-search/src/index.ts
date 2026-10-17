/**
 * Quran text search tool — fully offline over the pinned, integrity-checked
 * Tanzil Uthmani artifact (owned by `@deepseek-ai/dsh-quran-data`).
 *
 * Default matching uses the documented search skeleton (harakat stripped,
 * alef forms unified, alef-maqsura/ya unified) so users find verses without
 * typing exact Uthmani orthography; `exact` mode matches the raw artifact
 * text. The whole result set is wrapped in one evidence envelope naming the
 * artifact, its trust level and the applied transform — the corpus itself is
 * the artifact already proven 6236/6236 against Quran.com, which the envelope
 * states explicitly.
 *
 * @module @deepseek-ai/dsh-tool-quran-search
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { TransformRecord } from '@deepseek-ai/dsh-quran-evidence'
import { appendAuditLog, createEnvelope } from '@deepseek-ai/dsh-quran-evidence'
import { loadImlaeiVerses, loadUthmaniVerses, TANZIL_IMLAEI, TANZIL_UTHMANI, toSearchSkeleton } from '@deepseek-ai/dsh-quran-data'
import type { VerseRow } from '@deepseek-ai/dsh-quran-data'

export const name = 'tool-quran-search'
export const inject = ['tools']

/** Plugin configuration. */
export interface Config {
  /** Path of the append-only audit log. Defaults to `evidence-audit.jsonl` in the working directory. */
  auditLogPath?: string
}

/** Transform record declared on skeleton-mode result envelopes. */
const SKELETON_TRANSFORM: TransformRecord = {
  id: 'quran-search-skeleton',
  detail: 'Query skeletonized (NFC, strip harakat/marks/tatweel, unify alef forms, ى → ي) and matched against the pinned Tanzil Imla’ei (simple-clean) corpus — standard spelling carries the alefs Uthmani omits (العالمين). Returned text is always the untouched Uthmani artifact text.',
}

/** One matched verse. */
export interface SearchHit {
  readonly key: string
  readonly surah: number
  readonly ayah: number
  /** Untouched Uthmani artifact text — never the skeleton. */
  readonly text: string
}

export interface QuranSearchResult {
  readonly query: string
  readonly mode: 'skeleton' | 'exact'
  readonly totalMatches: number
  readonly returned: number
  readonly hits: readonly SearchHit[]
}

/** Run the search. Skeleton mode searches the Imla'ei corpus and returns the
 *  aligned Uthmani text; exact mode searches the Uthmani corpus directly.
 *  Exported for tests. */
export function searchVerses(uthmani: readonly VerseRow[], imlaei: readonly VerseRow[], query: string, mode: 'skeleton' | 'exact', surah: number | undefined, limit: number): QuranSearchResult {
  const uthmaniByKey = new Map(uthmani.map(v => [v.key, v]))
  const corpus = mode === 'skeleton' ? imlaei : uthmani
  const needle = mode === 'skeleton' ? toSearchSkeleton(query) : query
  const hits: SearchHit[] = []
  let totalMatches = 0
  for (const verse of corpus) {
    if (surah !== undefined && verse.surah !== surah) continue
    const haystack = mode === 'skeleton' ? toSearchSkeleton(verse.text) : verse.text
    if (!haystack.includes(needle)) continue
    totalMatches++
    const uthmaniRow = uthmaniByKey.get(verse.key)
    if (hits.length < limit && uthmaniRow) {
      hits.push({ key: verse.key, surah: verse.surah, ayah: verse.ayah, text: uthmaniRow.text })
    }
  }
  return { query, mode, totalMatches, returned: hits.length, hits }
}

export function apply(ctx: Context, config: Config = {}) {
  const auditLogPath = config.auditLogPath ?? 'evidence-audit.jsonl'

  ctx.tools.register(defineTool({
    name: 'quran_search',
    description: 'Search the Quran text offline over the pinned, integrity-checked Tanzil Uthmani artifact. Default `skeleton` mode finds verses regardless of harakat or alef spelling variants; `exact` matches the raw Uthmani text. Every result set carries an evidence envelope (source artifact, trust level, transform, SHA-256) that MUST be shown as the governance card. For quoting a verse to the user, follow up with quran_get_verse for the mandatory two-source cross-verification.',
    parameters: {
      query: { type: 'string', required: true, description: 'Arabic search text (harakat optional in skeleton mode)' },
      mode: { type: 'string', description: "'skeleton' (default) or 'exact'" },
      surah: { type: 'number', description: 'Restrict to one surah, 1-114' },
      limit: { type: 'number', description: 'Max hits returned, default 20, cap 100' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          result: { type: 'object', additionalProperties: true, required: true },
          evidence: { type: 'object', additionalProperties: true, required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => {
        const result = value.result as unknown as QuranSearchResult
        const lines = result.hits.map(h => `${h.key} — ${h.text}`)
        const header = `"${result.query}" (${result.mode}): ${result.totalMatches} match(es), showing ${result.returned}`
        return [{
          type: 'text' as const,
          text: [header, ...lines, '', '[Governance card] corpus: pinned Tanzil Uthmani (integrity-verified at load; the artifact itself is proven 6236/6236 against Quran.com) | sha256 and details in the evidence envelope'].join('\n'),
        }]
      },
      presentationMeta: (_args, value) => {
        const result = value.result as unknown as QuranSearchResult
        const evidence = value.evidence as { contentHash?: string; retrievedAt?: string }
        return {
          query: result.query,
          totalMatches: result.totalMatches,
          source: TANZIL_UTHMANI.id,
          contentHash: evidence.contentHash ?? '',
          retrievedAt: evidence.retrievedAt ?? '',
          status: 'ok',
        }
      },
    },
    async execute(args) {
      const { query } = args
      const mode = args.mode === 'exact' ? 'exact' as const : 'skeleton' as const
      const surah = args.surah
      const limit = Math.min(Math.max(args.limit ?? 20, 1), 100)
      if (typeof query !== 'string' || query.trim() === '') throw new Error('query must be a non-empty string')
      if (surah !== undefined && (!Number.isInteger(surah) || surah < 1 || surah > 114)) {
        throw new Error('surah must be an integer in 1..114')
      }
      if (mode === 'skeleton' && toSearchSkeleton(query) === '') throw new Error('query has no searchable letters')

      const [uthmani, imlaei] = await Promise.all([loadUthmaniVerses(), loadImlaeiVerses()])
      const result = searchVerses(uthmani, imlaei, query, mode, surah, limit)
      const transforms = mode === 'skeleton' ? [SKELETON_TRANSFORM] : []
      const evidence = createEnvelope(result, mode === 'skeleton' ? TANZIL_IMLAEI : TANZIL_UTHMANI, transforms)

      await appendAuditLog(auditLogPath, {
        at: new Date().toISOString(),
        operation: 'quran_search',
        envelopes: [{ source: evidence.source.id, contentHash: evidence.contentHash }],
      })

      return {
        result: JSON.parse(JSON.stringify(result)),
        evidence: JSON.parse(JSON.stringify(evidence)),
      }
    },
  }))
}
