/**
 * Quran audio tool: per-ayah recitation URLs from EveryAyah with live
 * availability verification (HTTP HEAD) recorded inside the evidence envelope
 * — the harness never hands out an unchecked media link. Verse validity is
 * checked against the pinned Tanzil artifact (Hafs numbering).
 *
 * @module @deepseek-ai/dsh-tool-quran-audio
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { SourceDescriptor } from '@deepseek-ai/dsh-quran-evidence'
import { appendAuditLog, createEnvelope } from '@deepseek-ai/dsh-quran-evidence'
import { getVerse } from '@deepseek-ai/dsh-quran-data'

export const name = 'tool-quran-audio'
export const inject = ['tools']

/** Plugin configuration. */
export interface Config {
  /** Path of the append-only audit log. Defaults to `evidence-audit.jsonl` in the working directory. */
  auditLogPath?: string
}

const EVERYAYAH: SourceDescriptor = {
  id: 'everyayah',
  name: 'EveryAyah — verse-by-verse recitation audio',
  url: 'https://everyayah.com/data/',
  trust: 'L3-community',
}

/** Default reciter: Mishary Rashid Alafasy, 128kbps verse-by-verse set. */
const DEFAULT_RECITER = 'Alafasy_128kbps'

/** Build the EveryAyah URL for one verse. Exported for tests. */
export function everyAyahUrl(reciter: string, surah: number, ayah: number): string {
  const pad = (n: number) => String(n).padStart(3, '0')
  return `${EVERYAYAH.url}${reciter}/${pad(surah)}${pad(ayah)}.mp3`
}

/** Live availability probe recorded in the envelope. */
export interface AvailabilityProbe {
  readonly ok: boolean
  readonly httpStatus: number
  readonly contentType: string | null
  readonly probedAt: string
}

/** HEAD-probe one media URL. Exported for tests. */
export async function probeUrl(url: string, signal?: AbortSignal): Promise<AvailabilityProbe> {
  const probedAt = new Date().toISOString()
  try {
    const res = await fetch(url, { method: 'HEAD', signal: signal ?? null })
    return {
      ok: res.ok,
      httpStatus: res.status,
      contentType: res.headers.get('content-type'),
      probedAt,
    }
  } catch {
    return { ok: false, httpStatus: 0, contentType: null, probedAt }
  }
}

export function apply(ctx: Context, config: Config = {}) {
  const auditLogPath = config.auditLogPath ?? 'evidence-audit.jsonl'

  ctx.tools.register(defineTool({
    name: 'quran_get_audio',
    description: 'Get the verse-by-verse recitation audio URL (MP3) for a Quran ayah from EveryAyah, with a live availability probe (HTTP HEAD) recorded in the evidence envelope. Always show the governance card. The verse reference is validated against the pinned Tanzil artifact (Hafs numbering). Default reciter: Alafasy 128kbps; other EveryAyah reciter folder names are accepted.',
    parameters: {
      surah: { type: 'number', required: true, description: 'Surah number, 1-114' },
      ayah: { type: 'number', required: true, description: 'Ayah number within the surah' },
      reciter: { type: 'string', description: `EveryAyah reciter folder, default ${DEFAULT_RECITER}` },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          url: { type: 'string', required: true },
          reference: { type: 'string', required: true },
          available: { type: 'boolean', required: true },
          evidence: { type: 'object', additionalProperties: true, required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => [{
        type: 'text' as const,
        text: value.available
          ? `${value.reference} recitation: ${value.url}\n\n[Governance card] source: EveryAyah | live probe: HTTP ${(value.evidence as { payload?: { probe?: AvailabilityProbe } }).payload?.probe?.httpStatus} | envelope sha256 in metadata`
          : `Audio for ${value.reference} is NOT reachable right now (probe failed). Do not present the URL as working.`,
      }],
      presentationMeta: (_args, value) => ({
        reference: value.reference,
        status: value.available ? 'ok' : 'mismatch',
        source: EVERYAYAH.id,
        url: value.url,
      }),
    },
    async execute(args, exec) {
      const { surah, ayah } = args
      const reciter = args.reciter ?? DEFAULT_RECITER
      if (!/^[A-Za-z0-9_-]+$/.test(reciter)) throw new Error('reciter must be an EveryAyah folder name (letters, digits, _ -)')
      const row = await getVerse(surah, ayah)
      if (row === undefined) throw new Error(`verse ${surah}:${ayah} not found (Hafs numbering, 6236 verses)`)

      const url = everyAyahUrl(reciter, surah, ayah)
      const probe = await probeUrl(url, exec.signal)
      const evidence = createEnvelope({ url, probe }, EVERYAYAH)

      await appendAuditLog(auditLogPath, {
        at: new Date().toISOString(),
        operation: 'quran_get_audio',
        envelopes: [{ source: evidence.source.id, contentHash: evidence.contentHash }],
      })

      return {
        url,
        reference: row.key,
        available: probe.ok,
        evidence: JSON.parse(JSON.stringify(evidence)),
      }
    },
  }))
}
