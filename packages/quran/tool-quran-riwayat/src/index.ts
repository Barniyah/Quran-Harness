/**
 * Riwayat structural comparison tool — offline, over quran-meta's eight
 * riwaya datasets (hafs, warsh, qalun, shuba, douri, sousi, bazzi, qunbul).
 * Answers where the riwayat differ structurally: ayah counts per surah and
 * verse positioning (page/juz/global id). The default/active riwaya of the
 * harness stays Hafs; this tool exists so answers about other riwayat are
 * computed from data, never assumed.
 *
 * @module @deepseek-ai/dsh-tool-quran-riwayat
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { SourceDescriptor } from '@deepseek-ai/dsh-quran-evidence'
import { appendAuditLog, createEnvelope } from '@deepseek-ai/dsh-quran-evidence'
import { createBazzi, createDouri, createHafs, createQalun, createQunbul, createShuba, createSousi, createWarsh } from 'quran-meta'
import type { AyahNo, Surah } from 'quran-meta'

export const name = 'tool-quran-riwayat'
export const inject = ['tools']

/** Plugin configuration. */
export interface Config {
  /** Path of the append-only audit log. Defaults to `evidence-audit.jsonl` in the working directory. */
  auditLogPath?: string
}

const QURAN_META: SourceDescriptor = {
  id: 'quran-meta-riwayat',
  name: 'quran-meta library (quran-center) — 8 riwayat datasets',
  url: 'https://github.com/quran-center/quran-meta',
  trust: 'L2-verified-open',
  version: '7.0.0',
}

/** Structural facts of one riwaya for the requested scope. */
export interface RiwayaRow {
  readonly riwaya: string
  readonly totalAyahs: number
  readonly surahAyahCount: number
  /** Present only when an ayah was requested. */
  readonly ayah?: {
    readonly globalAyahId: number
    readonly page: number
    readonly juz: number
  }
}

/** Compute the comparison table. Exported for tests. */
export function compareRiwayat(surah: number, ayah?: number): RiwayaRow[] {
  const makers = {
    hafs: createHafs, warsh: createWarsh, qalun: createQalun, shuba: createShuba,
    douri: createDouri, sousi: createSousi, bazzi: createBazzi, qunbul: createQunbul,
  }
  const rows: RiwayaRow[] = []
  for (const [riwaya, make] of Object.entries(makers)) {
    const q = make()
    const surahAyahCount = q.getAyahCountInSurah(surah as Surah)
    rows.push({
      riwaya,
      totalAyahs: q.meta.numAyahs,
      surahAyahCount,
      ...(ayah !== undefined && ayah <= surahAyahCount ? (() => {
        const id = q.findAyahIdBySurah(surah as Surah, ayah as AyahNo)
        const juz = q.findJuzMetaBySurah(surah as Surah, ayah as AyahNo).leftJuz
        return { ayah: { globalAyahId: id, page: q.findPagebyAyahId(id), juz } }
      })() : {}),
    })
  }
  return rows
}

export function apply(ctx: Context, config: Config = {}) {
  const auditLogPath = config.auditLogPath ?? 'evidence-audit.jsonl'

  ctx.tools.register(defineTool({
    name: 'quran_compare_riwayat',
    description: 'Compare the 8 riwayat (hafs/warsh/qalun/shuba/douri/sousi/bazzi/qunbul) structurally for a surah — ayah counts — and optionally one ayah\u2019s page/juz/global-id per riwaya. Offline via quran-meta. The harness default stays Hafs; this tool answers riwayat questions from data. Always show the governance card.',
    parameters: {
      surah: { type: 'number', required: true, description: 'Surah number, 1-114' },
      ayah: { type: 'number', description: 'Optional ayah number to position per riwaya' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          surah: { type: 'number', required: true },
          rows: { type: 'array', required: true },
          differFromHafs: { type: 'array', required: true },
          evidence: { type: 'object', additionalProperties: true, required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => {
        const rows = value.rows as unknown as RiwayaRow[]
        const lines = rows.map(r => `${r.riwaya}: ${r.surahAyahCount} ayahs (total ${r.totalAyahs})${r.ayah ? ` — page ${r.ayah.page}, juz ${r.ayah.juz}, id ${r.ayah.globalAyahId}` : ''}`)
        const differ = value.differFromHafs as string[]
        return [{
          type: 'text' as const,
          text: [`Surah ${value.surah} across riwayat:`, ...lines, '', differ.length ? `Differ from hafs structurally: ${differ.join(', ')}` : 'All riwayat share this structure.', '', '[Governance card] source: quran-meta (offline) | envelope in metadata'].join('\n'),
        }]
      },
      presentationMeta: (_args, value) => ({
        surah: value.surah,
        status: 'ok',
        source: QURAN_META.id,
      }),
    },
    async execute(args) {
      const { surah, ayah } = args
      if (!Number.isInteger(surah) || surah < 1 || surah > 114) throw new Error('surah must be an integer in 1..114')
      const rows = compareRiwayat(surah, ayah)
      const hafs = rows.find(r => r.riwaya === 'hafs')
      if (!hafs) throw new Error('hafs row missing from comparison')
      const differFromHafs = rows
        .filter(r => r.riwaya !== 'hafs' && (r.surahAyahCount !== hafs.surahAyahCount || r.totalAyahs !== hafs.totalAyahs || JSON.stringify(r.ayah) !== JSON.stringify(hafs.ayah)))
        .map(r => r.riwaya)

      const evidence = createEnvelope({ surah, ayah, rows }, QURAN_META)
      await appendAuditLog(auditLogPath, {
        at: new Date().toISOString(),
        operation: 'quran_compare_riwayat',
        envelopes: [{ source: evidence.source.id, contentHash: evidence.contentHash }],
      })
      return {
        surah,
        rows: JSON.parse(JSON.stringify(rows)),
        differFromHafs: JSON.parse(JSON.stringify(differFromHafs)),
        evidence: JSON.parse(JSON.stringify(evidence)),
      }
    },
  }))
}
