/**
 * Quran translations tool: per-ayah translations from the Quran.com API v4
 * (Quran Foundation). The translation resource is always named (id + author);
 * the verse reference is validated against the pinned Tanzil artifact.
 *
 * @module @deepseek-ai/dsh-tool-quran-translations
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { SourceDescriptor } from '@deepseek-ai/dsh-quran-evidence'
import { appendAuditLog, createEnvelope } from '@deepseek-ai/dsh-quran-evidence'
import { getVerse } from '@deepseek-ai/dsh-quran-data'

export const name = 'tool-quran-translations'
export const inject = ['tools']

/** Plugin configuration. */
export interface Config {
  /** Path of the append-only audit log. Defaults to `evidence-audit.jsonl` in the working directory. */
  auditLogPath?: string
}

const QURAN_COM: SourceDescriptor = {
  id: 'quran-com-v4-translations',
  name: 'Quran.com API v4 (Quran Foundation) — translations',
  url: 'https://api.quran.com/api/v4',
  trust: 'L2-verified-open',
}

/** Well-known translation resources (id → label), probed 2026-10-18. */
export const KNOWN_TRANSLATIONS: Record<number, string> = {
  85: 'M.A.S. Abdel Haleem (English)',
  20: 'Saheeh International (English)',
  84: 'T. Usmani (English)',
  19: 'M. Pickthall (English)',
  95: 'A. Maududi — Tafhim commentary (English)',
}

/** One translation row returned for a verse. */
export interface VerseTranslation {
  readonly resourceId: number
  readonly resourceName: string
  readonly text: string
}

/** Fetch one verse's translations. Exported for tests. */
export async function fetchTranslations(
  surah: number,
  ayah: number,
  translationIds: readonly number[],
  signal?: AbortSignal,
): Promise<VerseTranslation[]> {
  const ids = translationIds.join(',')
  const res = await fetch(`${QURAN_COM.url}/verses/by_key/${surah}:${ayah}?translations=${ids}`, { signal: signal ?? null })
  if (!res.ok) throw new Error(`Quran.com API responded ${res.status}`)
  const body = await res.json() as { verse?: { translations?: { resource_id: number; text: string }[] } }
  const rows = body.verse?.translations ?? []
  return rows.map(t => ({
    resourceId: t.resource_id,
    resourceName: KNOWN_TRANSLATIONS[t.resource_id] ?? `Quran.com resource #${t.resource_id}`,
    text: t.text,
  }))
}

export function apply(ctx: Context, config: Config = {}) {
  const auditLogPath = config.auditLogPath ?? 'evidence-audit.jsonl'

  ctx.tools.register(defineTool({
    name: 'quran_get_translation',
    description: `Get the translation of one ayah from named Quran.com resources. Known ids: ${Object.entries(KNOWN_TRANSLATIONS).map(([id, n]) => `${id}=${n}`).join('; ')}. Other numeric ids are accepted and labeled by id. Always name the translator(s) to the user and show the governance card.`,
    parameters: {
      surah: { type: 'number', required: true, description: 'Surah number, 1-114' },
      ayah: { type: 'number', required: true, description: 'Ayah number within the surah' },
      translationIds: { type: 'string', description: 'Comma-separated resource ids, default 85 (Abdel Haleem)' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          reference: { type: 'string', required: true },
          translations: { type: 'array', required: true },
          evidence: { type: 'object', additionalProperties: true, required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => {
        const rows = value.translations as unknown as VerseTranslation[]
        const lines = rows.map(t => `[${t.resourceName}] ${t.text}`)
        return [{
          type: 'text' as const,
          text: [`Translation of ${value.reference}:`, ...lines, '', '[Governance card] source: Quran.com API v4 | envelope sha256 in metadata'].join('\n'),
        }]
      },
      presentationMeta: (_args, value) => ({
        reference: value.reference,
        status: 'ok',
        source: QURAN_COM.id,
      }),
    },
    async execute(args, exec) {
      const { surah, ayah } = args
      const ids = (args.translationIds ?? '85').split(',').map((s) => {
        const n = Number(s.trim())
        if (!Number.isInteger(n) || n < 1) throw new Error(`invalid translation id: ${s}`)
        return n
      })
      const row = await getVerse(surah, ayah)
      if (row === undefined) throw new Error(`verse ${surah}:${ayah} not found (Hafs numbering, 6236 verses)`)

      const translations = await fetchTranslations(surah, ayah, ids, exec.signal)
      if (translations.length === 0) throw new Error(`no translations returned for ${surah}:${ayah} (ids: ${ids.join(',')})`)
      const evidence = createEnvelope(translations, QURAN_COM)
      await appendAuditLog(auditLogPath, {
        at: new Date().toISOString(),
        operation: 'quran_get_translation',
        envelopes: [{ source: evidence.source.id, contentHash: evidence.contentHash }],
      })
      return {
        reference: row.key,
        translations: JSON.parse(JSON.stringify(translations)),
        evidence: JSON.parse(JSON.stringify(evidence)),
      }
    },
  }))
}
