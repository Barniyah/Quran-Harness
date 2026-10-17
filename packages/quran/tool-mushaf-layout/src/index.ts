/**
 * Mushaf page composition tool: the ayah ranges on each printed page of the
 * Hafs 604-page Medina mushaf, computed offline from quran-meta's page map.
 *
 * Honest scope: this is page-level composition (which ayahs, in order, sit on
 * the page), not line-level layout. True 15-line layout data lives behind
 * QUL's signed-in downloads — recorded in PROGRESS.md; until an accessible
 * source is pinned, the tool states its level explicitly.
 *
 * @module @deepseek-ai/dsh-tool-mushaf-layout
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { SourceDescriptor } from '@deepseek-ai/dsh-quran-evidence'
import { appendAuditLog, createEnvelope } from '@deepseek-ai/dsh-quran-evidence'
import { createHafs } from 'quran-meta'

export const name = 'tool-mushaf-layout'
export const inject = ['tools']

/** Plugin configuration. */
export interface Config {
  /** Path of the append-only audit log. Defaults to `evidence-audit.jsonl` in the working directory. */
  auditLogPath?: string
}

const QURAN_META: SourceDescriptor = {
  id: 'quran-meta-pages',
  name: 'quran-meta library (quran-center) — Hafs page map',
  url: 'https://github.com/quran-center/quran-meta',
  trust: 'L2-verified-open',
  version: '7.0.0',
}

/** Printed page count of the Hafs Medina mushaf. */
export const PAGE_COUNT = 604

/** One surah's ayah span on a page. */
export interface PageSpan {
  readonly surah: number
  readonly fromAyah: number
  readonly toAyah: number
}

/** Build the full page index once: page → ordered surah spans. Exported for tests. */
export function buildPageIndex(): PageSpan[][] {
  const hafs = createHafs()
  const pages: PageSpan[][] = Array.from({ length: PAGE_COUNT }, () => [])
  for (let id = 1; id <= hafs.meta.numAyahs; id++) {
    const page = hafs.findPagebyAyahId(id)
    const [surah, ayah] = hafs.findSurahAyahByAyahId(id)
    const spans = pages[page - 1]
    if (!spans) continue
    const last = spans[spans.length - 1]
    if (last && last.surah === surah) {
      spans[spans.length - 1] = { surah, fromAyah: last.fromAyah, toAyah: ayah }
    } else {
      spans.push({ surah, fromAyah: ayah, toAyah: ayah })
    }
  }
  return pages
}

let indexCache: PageSpan[][] | undefined

/** The cached page index. */
export function getPageIndex(): PageSpan[][] {
  indexCache ??= buildPageIndex()
  return indexCache
}

/** Composition of one page; undefined when out of range. */
export function getPageComposition(page: number): PageSpan[] | undefined {
  if (!Number.isInteger(page) || page < 1 || page > PAGE_COUNT) return undefined
  return getPageIndex()[page - 1]
}

export function apply(ctx: Context, config: Config = {}) {
  const auditLogPath = config.auditLogPath ?? 'evidence-audit.jsonl'

  ctx.tools.register(defineTool({
    name: 'quran_get_page_layout',
    description: 'Get the ayah composition of one printed mushaf page (1-604, Hafs Medina layout): which surah/ayah spans sit on it, in order. Offline via quran-meta. Page-level composition, NOT line-level layout (that data requires QUL sign-in — not yet pinned). Always show the governance card.',
    parameters: {
      page: { type: 'number', required: true, description: 'Mushaf page number, 1-604' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          page: { type: 'number', required: true },
          spans: { type: 'array', required: true },
          level: { type: 'string', required: true },
          evidence: { type: 'object', additionalProperties: true, required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => {
        const spans = value.spans as unknown as PageSpan[]
        const lines = spans.map(s => s.fromAyah === s.toAyah ? `${s.surah}:${s.fromAyah}` : `${s.surah}:${s.fromAyah}-${s.toAyah}`)
        return [{
          type: 'text' as const,
          text: [`Page ${value.page} (level: ${value.level}):`, ...lines, '', '[Governance card] source: quran-meta (offline) | envelope in metadata'].join('\n'),
        }]
      },
      presentationMeta: (_args, value) => ({
        reference: `page ${value.page}`,
        status: 'ok',
        source: QURAN_META.id,
      }),
    },
    async execute(args) {
      const composition = getPageComposition(args.page)
      if (composition === undefined) throw new Error(`page must be an integer in 1..${PAGE_COUNT}`)
      const payload = { page: args.page, spans: composition, level: 'page-composition' }
      const evidence = createEnvelope(payload, QURAN_META)
      await appendAuditLog(auditLogPath, {
        at: new Date().toISOString(),
        operation: 'quran_get_page_layout',
        envelopes: [{ source: evidence.source.id, contentHash: evidence.contentHash }],
      })
      return { ...JSON.parse(JSON.stringify(payload)), evidence: JSON.parse(JSON.stringify(evidence)) }
    },
  }))
}
