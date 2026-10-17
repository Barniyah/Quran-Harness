/**
 * Ayah timing tool: start/end/duration of any ayah in the pinned Husary
 * (Murattal) timing set — fully offline, integrity-checked at load, with the
 * matching EveryAyah audio URL so callers can align playback. The intro
 * segment convention (leading basmalah/isti'adha dropped) is documented in
 * the artifact itself and surfaced in the envelope transforms.
 *
 * @module @deepseek-ai/dsh-tool-quran-timing
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { TransformRecord } from '@deepseek-ai/dsh-quran-evidence'
import { appendAuditLog, createEnvelope } from '@deepseek-ai/dsh-quran-evidence'
import { ayahTiming, EVERYAYAH_TIMING_HUSARY, getVerse, loadHusaryTiming } from '@deepseek-ai/dsh-quran-data'
import { everyAyahUrl } from '@deepseek-ai/dsh-tool-quran-audio'

export const name = 'tool-quran-timing'
export const inject = ['tools']

/** Plugin configuration. */
export interface Config {
  /** Path of the append-only audit log. Defaults to `evidence-audit.jsonl` in the working directory. */
  auditLogPath?: string
}

const TIMING_CONVENTION: TransformRecord = {
  id: 'everyayah-timing-convention',
  detail: 'ayahEndMs[i] = cumulative end of ayah i+1 (ms from surah audio start); start = previous end or 0. Source files carry a leading intro segment (basmalah/isti\u2019adha) in 113 surahs — dropped, documented in the artifact; surah 1 has none (basmalah IS ayah 1).',
}

export function apply(ctx: Context, config: Config = {}) {
  const auditLogPath = config.auditLogPath ?? 'evidence-audit.jsonl'

  ctx.tools.register(defineTool({
    name: 'quran_get_ayah_timing',
    description: 'Get the recitation timing of one ayah (start/end/duration in ms) from the pinned Husary Murattal set, plus the matching per-ayah audio URL. Offline and integrity-checked. Always show the governance card.',
    parameters: {
      surah: { type: 'number', required: true, description: 'Surah number, 1-114' },
      ayah: { type: 'number', required: true, description: 'Ayah number within the surah' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          timing: { type: 'object', additionalProperties: true, required: true },
          audioUrl: { type: 'string', required: true },
          reference: { type: 'string', required: true },
          evidence: { type: 'object', additionalProperties: true, required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => {
        const t = value.timing as { startMs: number; endMs: number; durationMs: number }
        const fmt = (ms: number) => `${(ms / 1000).toFixed(2)}s`
        return [{
          type: 'text' as const,
          text: `${value.reference}: ${fmt(t.startMs)} → ${fmt(t.endMs)} (duration ${fmt(t.durationMs)})\nAudio: ${value.audioUrl}\n\n[Governance card] source: EveryAyah Husary timings (pinned + integrity-checked) | convention in envelope transforms`,
        }]
      },
      presentationMeta: (_args, value) => ({
        reference: value.reference,
        status: 'ok',
        source: EVERYAYAH_TIMING_HUSARY.id,
      }),
    },
    async execute(args) {
      const { surah, ayah } = args
      const row = await getVerse(surah, ayah)
      if (row === undefined) throw new Error(`verse ${surah}:${ayah} not found (Hafs numbering, 6236 verses)`)
      const timing = await loadHusaryTiming()
      const span = ayahTiming(timing, surah, ayah)
      if (span === undefined) throw new Error(`no timing for ${surah}:${ayah} in the Husary set`)

      const payload = { reference: row.key, ...span, reciter: timing.reciterName }
      const evidence = createEnvelope(payload, EVERYAYAH_TIMING_HUSARY, [TIMING_CONVENTION])
      await appendAuditLog(auditLogPath, {
        at: new Date().toISOString(),
        operation: 'quran_get_ayah_timing',
        envelopes: [{ source: evidence.source.id, contentHash: evidence.contentHash }],
      })
      return {
        timing: JSON.parse(JSON.stringify(payload)),
        audioUrl: everyAyahUrl('Husary_128kbps', surah, ayah),
        reference: row.key,
        evidence: JSON.parse(JSON.stringify(evidence)),
      }
    },
  }))
}
