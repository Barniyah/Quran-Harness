/**
 * Quran structural metadata tool with mandatory evidence envelope.
 *
 * Serves offline structural facts (surah names, ayah counts, juz, page,
 * rub al-hizb) from the `quran-meta` library (Hafs riwaya), every result
 * wrapped in an evidence envelope so the UI can render the governance card.
 *
 * @module @deepseek-ai/dsh-tool-quran-metadata
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { EvidenceEnvelope, SourceDescriptor } from '@deepseek-ai/dsh-quran-evidence'
import { appendAuditLog, createEnvelope } from '@deepseek-ai/dsh-quran-evidence'
import { createHafs, getSurahName, surahNamesAr, meta } from 'quran-meta'
import type { AyahNo, Surah } from 'quran-meta'

export const name = 'tool-quran-metadata'
export const inject = ['tools']

/** Plugin configuration. */
export interface Config {
  /** Path of the append-only audit log. Defaults to `evidence-audit.jsonl` in the working directory. */
  auditLogPath?: string
}

const QURAN_META: SourceDescriptor = {
  id: 'quran-meta-hafs',
  name: 'quran-meta library (quran-center) — Hafs riwaya',
  url: 'https://github.com/quran-center/quran-meta',
  trust: 'L2-verified-open',
  version: '7.0.0',
}

/** Structural facts for one surah or one verse. */
export interface QuranMetadata {
  readonly surah: number
  readonly nameAr: string
  readonly nameEn: string
  readonly meaningEn: string
  readonly ayahCount: number
  readonly isMakki: boolean
  /** Present only when an ayah was requested. */
  readonly ayah?: {
    readonly ayah: number
    readonly globalAyahId: number
    readonly page: number
    readonly juz: number
    readonly rubAlHizb: number
  }
}

export interface QuranMetadataResult {
  readonly metadata: QuranMetadata
  readonly evidence: EvidenceEnvelope<QuranMetadata>
}

export function apply(ctx: Context, config: Config = {}) {
  const auditLogPath = config.auditLogPath ?? 'evidence-audit.jsonl'
  const hafs = createHafs()

  ctx.tools.register(defineTool({
    name: 'quran_get_metadata',
    description: 'Get structural Quran metadata (surah names in Arabic/English, ayah count, Makki/Madani, and optionally page/juz/rub-al-hizb for a specific ayah). Offline, from the quran-meta library (Hafs). The result always carries an evidence envelope that MUST be shown to the user as a governance card.',
    parameters: {
      surah: { type: 'number', required: true, description: 'Surah number, 1-114' },
      ayah: { type: 'number', description: 'Optional ayah number for verse-level page/juz/hizb facts' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          metadata: { type: 'object', additionalProperties: true, required: true },
          evidence: { type: 'object', additionalProperties: true, required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => {
        const m = value.metadata as unknown as QuranMetadata
        const evidence = value.evidence as unknown as EvidenceEnvelope<QuranMetadata>
        const ayahLine = m.ayah ? ` — ayah ${m.ayah.ayah}: page ${m.ayah.page}, juz ${m.ayah.juz}, rub ${m.ayah.rubAlHizb}` : ''
        return [{
          type: 'text' as const,
          text: `Surah ${m.surah} ${m.nameAr} (${m.nameEn} — ${m.meaningEn}), ${m.ayahCount} ayahs, ${m.isMakki ? 'Makki' : 'Madani'}${ayahLine}\n\n[Governance card] source: ${evidence.source.name} v${evidence.source.version} | sha256: ${evidence.contentHash.slice(0, 16)}… | fetched: ${evidence.retrievedAt}`,
        }]
      },
      presentationMeta: (_args, value) => {
        const m = value.metadata as unknown as QuranMetadata
        const evidence = value.evidence as unknown as EvidenceEnvelope<QuranMetadata>
        return {
          surah: m.surah,
          source: evidence.source.id,
          contentHash: evidence.contentHash,
          retrievedAt: evidence.retrievedAt,
        }
      },
    },
    async execute(args) {
      const { surah, ayah } = args
      if (!Number.isInteger(surah) || surah < 1 || surah > meta.numSurahs) {
        throw new Error(`surah must be an integer in 1..${meta.numSurahs}`)
      }

      const info = hafs.getSurahInfo(surah as Surah)
      const ayahCount = info[1] as number
      const nameArTashkeel = info[4] as string
      const isMakki = info[5] as boolean
      const [nameEn, meaningEn] = getSurahName(surah as Surah)
      const nameAr = (surahNamesAr[surah]?.[1] ?? nameArTashkeel) as string

      const metadata: QuranMetadata = {
        surah,
        nameAr,
        nameEn: nameEn as string,
        meaningEn: meaningEn as string,
        ayahCount,
        isMakki,
        ...(ayah !== undefined ? (() => {
          if (!Number.isInteger(ayah) || ayah < 1 || ayah > ayahCount) {
            throw new Error(`ayah must be an integer in 1..${ayahCount} for surah ${surah}`)
          }
          const globalAyahId = hafs.findAyahIdBySurah(surah as Surah, ayah as AyahNo)
          return {
            ayah: {
              ayah,
              globalAyahId,
              page: hafs.findPagebyAyahId(globalAyahId),
              juz: hafs.findJuzMetaBySurah(surah as Surah, ayah as AyahNo).leftJuz,
              rubAlHizb: hafs.findRubAlHizbByAyahId(globalAyahId),
            },
          }
        })() : {}),
      }

      const evidence = createEnvelope(metadata, QURAN_META)
      await appendAuditLog(auditLogPath, {
        at: new Date().toISOString(),
        operation: 'quran_get_metadata',
        envelopes: [{ source: evidence.source.id, contentHash: evidence.contentHash }],
      })

      return {
        metadata: JSON.parse(JSON.stringify(metadata)),
        evidence: JSON.parse(JSON.stringify(evidence)),
      }
    },
  }))
}
