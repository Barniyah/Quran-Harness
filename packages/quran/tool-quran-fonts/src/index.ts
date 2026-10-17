/**
 * Quran fonts tool: the official King Fahd Glorious Quran Complex (KFGC) font
 * catalog with direct download URLs, harvested from the Complex's site on
 * 2026-10-17 and pinned here; on demand each URL is live-probed (HTTP HEAD)
 * and the probe recorded in the evidence envelope.
 *
 * @module @deepseek-ai/dsh-tool-quran-fonts
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { SourceDescriptor } from '@deepseek-ai/dsh-quran-evidence'
import { appendAuditLog, createEnvelope } from '@deepseek-ai/dsh-quran-evidence'
import { probeUrl } from '@deepseek-ai/dsh-tool-quran-audio'
import type { AvailabilityProbe } from '@deepseek-ai/dsh-tool-quran-audio'

export const name = 'tool-quran-fonts'
export const inject = ['tools']

/** Plugin configuration. */
export interface Config {
  /** Path of the append-only audit log. Defaults to `evidence-audit.jsonl` in the working directory. */
  auditLogPath?: string
}

const KFGC: SourceDescriptor = {
  id: 'kfgc-fonts',
  name: 'King Fahd Glorious Quran Complex — official fonts',
  url: 'https://fonts.qurancomplex.gov.sa/',
  trust: 'L1-official',
  version: 'harvested-2026-10-17',
}

/** One pinned font entry from the KFGC catalog. */
export interface FontEntry {
  readonly name: string
  readonly file: string
  readonly url: string
}

/** The pinned KFGC catalog (15 official fonts, direct upload URLs). */
export const KFGC_FONTS: readonly FontEntry[] = [
  { name: 'UthmanTN (Uthmani text)', file: 'UthmanTN_v2-0.ttf', url: 'https://fonts.qurancomplex.gov.sa/wp-content/uploads/2022/12/UthmanTN_v2-0.ttf' },
  { name: 'UthmanTN Bold', file: 'UthmanTNB_v2-0.ttf', url: 'https://fonts.qurancomplex.gov.sa/wp-content/uploads/2022/12/UthmanTNB_v2-0.ttf' },
  { name: 'KFGQPC An Regular', file: 'KFGQPCAnRegular.ttf', url: 'https://fonts.qurancomplex.gov.sa/wp-content/uploads/2022/12/KFGQPCAnRegular.ttf' },
  { name: 'KFGQPC An Bold', file: 'KFGQPCAnBold.ttf', url: 'https://fonts.qurancomplex.gov.sa/wp-content/uploads/2022/12/KFGQPCAnBold.ttf' },
  { name: 'KFGQPC An Light', file: 'KFGQPCAnLight.ttf', url: 'https://fonts.qurancomplex.gov.sa/wp-content/uploads/2022/12/KFGQPCAnLight.ttf' },
  { name: 'KFGQPC An Extra', file: 'KFGQPCAnExtra.ttf', url: 'https://fonts.qurancomplex.gov.sa/wp-content/uploads/2022/12/KFGQPCAnExtra.ttf' },
  { name: 'KFGQPC Kufi Style', file: 'KFGQPC-KufiStyV14.ttf', url: 'https://fonts.qurancomplex.gov.sa/wp-content/uploads/fonts/KFGQPC-KufiStyV14.ttf' },
  { name: 'KFGQPC Kufi Extended', file: 'KFGQPC-KufiExtV14.ttf', url: 'https://fonts.qurancomplex.gov.sa/wp-content/uploads/fonts/KFGQPC-KufiExtV14.ttf' },
  { name: 'KFGQPC Dot Font', file: 'KFGQPCDotFont.otf', url: 'https://fonts.qurancomplex.gov.sa/wp-content/uploads/2022/12/KFGQPCDotFont.otf' },
  { name: 'KSA Regular', file: 'KSARegular.ttf', url: 'https://fonts.qurancomplex.gov.sa/wp-content/uploads/2022/12/KSARegular.ttf' },
  { name: 'KSA Regular B', file: 'KSARegular_B.ttf', url: 'https://fonts.qurancomplex.gov.sa/wp-content/uploads/2022/12/KSARegular_B.ttf' },
  { name: 'KSA Heading', file: 'KSAHeading.ttf', url: 'https://fonts.qurancomplex.gov.sa/wp-content/uploads/2022/12/KSAHeading.ttf' },
  { name: 'KSA Heavy', file: 'KSAHeavy.ttf', url: 'https://fonts.qurancomplex.gov.sa/wp-content/uploads/2022/12/KSAHeavy.ttf' },
  { name: 'KSA Extra', file: 'KSAExtra.ttf', url: 'https://fonts.qurancomplex.gov.sa/wp-content/uploads/2022/12/KSAExtra.ttf' },
  { name: 'Outlined', file: 'Outlinedv001.otf', url: 'https://fonts.qurancomplex.gov.sa/wp-content/uploads/2022/12/Outlinedv001.otf' },
]

/** Look up one font by file name or display name (case-insensitive). */
export function findFont(query: string): FontEntry | undefined {
  const q = query.toLowerCase()
  return KFGC_FONTS.find(f => f.file.toLowerCase() === q || f.name.toLowerCase() === q || f.file.toLowerCase().startsWith(q))
}

export function apply(ctx: Context, config: Config = {}) {
  const auditLogPath = config.auditLogPath ?? 'evidence-audit.jsonl'

  ctx.tools.register(defineTool({
    name: 'quran_get_fonts',
    description: 'List the official KFGC Quran font catalog (15 fonts with direct download URLs), or fetch one font with a live availability probe recorded in the evidence envelope. Always show the governance card.',
    parameters: {
      font: { type: 'string', description: 'Font file or display name (e.g. UthmanTN_v2-0.ttf) — omit to list the whole catalog' },
      verify: { type: 'boolean', description: 'Live-probe the URL before answering (default true when a single font is requested)' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          fonts: { type: 'array', required: true },
          probe: { type: 'object', additionalProperties: true },
          evidence: { type: 'object', additionalProperties: true, required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => {
        const fonts = value.fonts as unknown as FontEntry[]
        const probe = value.probe as AvailabilityProbe | undefined
        const lines = fonts.map(f => `${f.name} — ${f.url}`)
        const probeLine = probe ? `Live probe: HTTP ${probe.httpStatus} (${probe.ok ? 'available' : 'UNAVAILABLE'})` : 'Not probed (catalog listing).'
        return [{
          type: 'text' as const,
          text: [...lines, '', probeLine, '[Governance card] source: KFGC official fonts | envelope in metadata'].join('\n'),
        }]
      },
      presentationMeta: (_args, value) => ({
        status: 'ok',
        source: KFGC.id,
        count: (value.fonts as unknown[]).length,
      }),
    },
    async execute(args, exec) {
      const verify = args.verify ?? (args.font !== undefined)
      let fonts: readonly FontEntry[]
      if (args.font !== undefined) {
        const found = findFont(args.font)
        if (!found) throw new Error(`font not in the pinned KFGC catalog: ${args.font}`)
        fonts = [found]
      } else {
        fonts = KFGC_FONTS
      }

      let probe: AvailabilityProbe | undefined
      if (verify && fonts.length === 1) {
        const only = fonts[0]
        if (only) probe = await probeUrl(only.url, exec.signal)
      }

      const evidence = createEnvelope({ fonts, probe }, KFGC)
      await appendAuditLog(auditLogPath, {
        at: new Date().toISOString(),
        operation: 'quran_get_fonts',
        envelopes: [{ source: evidence.source.id, contentHash: evidence.contentHash }],
      })
      return {
        fonts: JSON.parse(JSON.stringify(fonts)),
        ...(probe ? { probe: JSON.parse(JSON.stringify(probe)) } : {}),
        evidence: JSON.parse(JSON.stringify(evidence)),
      }
    },
  }))
}
