/**
 * Tafsir tool: named tafsir editions served as per-ayah JSON from the
 * tafsir_api project's jsDelivr CDN (spa5k/tafsir_api — community mirror of
 * classic editions). Every response body is hashed into the evidence
 * envelope; the edition is always named — the agent never paraphrases tafsir
 * without attribution.
 *
 * @module @deepseek-ai/dsh-tool-quran-tafsir
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { SourceDescriptor } from '@deepseek-ai/dsh-quran-evidence'
import { appendAuditLog, createEnvelope } from '@deepseek-ai/dsh-quran-evidence'
import { getVerse } from '@deepseek-ai/dsh-quran-data'

export const name = 'tool-quran-tafsir'
export const inject = ['tools']

/** Plugin configuration. */
export interface Config {
  /** Path of the append-only audit log. Defaults to `evidence-audit.jsonl` in the working directory. */
  auditLogPath?: string
}

const TAFSIR_API: SourceDescriptor = {
  id: 'tafsir-api-jsdelivr',
  name: 'tafsir_api (spa5k) via jsDelivr CDN',
  url: 'https://github.com/spa5k/tafsir_api',
  trust: 'L3-community',
}

/** Pinned, probed-on-2026-10-18 tafsir editions on the CDN. */
export const TAFSIR_EDITIONS = {
  'ar-tafsir-ibn-kathir': 'تفسير ابن كثير (عربي)',
  'ar-tafsir-al-tabari': 'تفسير الطبري (عربي)',
  'ar-tafseer-al-qurtubi': 'تفسير القرطبي (عربي)',
  'ar-tafsir-muyassar': 'التفسير الميسّر (عربي)',
  'en-tafisr-ibn-kathir': 'Tafsir Ibn Kathir (English abridged)',
} as const

export type TafsirEdition = keyof typeof TAFSIR_EDITIONS

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir'

/** Build the CDN URL for one ayah in one edition. Exported for tests. */
export function tafsirUrl(edition: TafsirEdition, surah: number, ayah: number): string {
  return `${CDN_BASE}/${edition}/${surah}/${ayah}.json`
}

/** Fetch one ayah's tafsir text. Exported for tests. */
export async function fetchTafsir(edition: TafsirEdition, surah: number, ayah: number, signal?: AbortSignal): Promise<string> {
  const res = await fetch(tafsirUrl(edition, surah, ayah), { signal: signal ?? null })
  if (!res.ok) throw new Error(`tafsir CDN responded ${res.status} for ${edition} ${surah}:${ayah}`)
  const body = await res.json() as { text?: string }
  if (typeof body.text !== 'string' || body.text.trim() === '') {
    throw new Error(`empty tafsir for ${surah}:${ayah} in ${edition}`)
  }
  return body.text
}

export function apply(ctx: Context, config: Config = {}) {
  const auditLogPath = config.auditLogPath ?? 'evidence-audit.jsonl'

  ctx.tools.register(defineTool({
    name: 'quran_get_tafsir',
    description: `Get the tafsir of one ayah from a NAMED edition: ${Object.keys(TAFSIR_EDITIONS).join(', ')} (default ar-tafsir-ibn-kathir). Always attribute the edition to the user, never paraphrase tafsir as your own, and show the governance card.`,
    parameters: {
      surah: { type: 'number', required: true, description: 'Surah number, 1-114' },
      ayah: { type: 'number', required: true, description: 'Ayah number within the surah' },
      edition: { type: 'string', description: `Edition key; one of: ${Object.keys(TAFSIR_EDITIONS).join(', ')}` },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          reference: { type: 'string', required: true },
          edition: { type: 'string', required: true },
          editionName: { type: 'string', required: true },
          text: { type: 'string', required: true },
          evidence: { type: 'object', additionalProperties: true, required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => [{
        type: 'text' as const,
        text: `تفسير ${value.editionName} — ${value.reference}:\n${value.text}\n\n[Governance card] source: tafsir_api CDN | edition: ${value.edition} | envelope sha256 in metadata`,
      }],
      presentationMeta: (_args, value) => ({
        reference: value.reference,
        status: 'ok',
        source: TAFSIR_API.id,
        edition: value.edition,
      }),
    },
    async execute(args, exec) {
      const { surah, ayah } = args
      const edition = (args.edition ?? 'ar-tafsir-ibn-kathir') as TafsirEdition
      if (!(edition in TAFSIR_EDITIONS)) {
        throw new Error(`unknown tafsir edition "${edition}"; allowed: ${Object.keys(TAFSIR_EDITIONS).join(', ')}`)
      }
      const row = await getVerse(surah, ayah)
      if (row === undefined) throw new Error(`verse ${surah}:${ayah} not found (Hafs numbering, 6236 verses)`)

      const text = await fetchTafsir(edition, surah, ayah, exec.signal)
      const evidence = createEnvelope(text, TAFSIR_API, [{ id: 'edition-attribution', detail: `${edition} (${TAFSIR_EDITIONS[edition]})` }])
      await appendAuditLog(auditLogPath, {
        at: new Date().toISOString(),
        operation: 'quran_get_tafsir',
        envelopes: [{ source: evidence.source.id, contentHash: evidence.contentHash }],
      })
      return {
        reference: row.key,
        edition,
        editionName: TAFSIR_EDITIONS[edition],
        text,
        evidence: JSON.parse(JSON.stringify(evidence)),
      }
    },
  }))
}
