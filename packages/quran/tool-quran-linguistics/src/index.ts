/**
 * Quranic linguistics tool: word-by-word morphology of any ayah — segments,
 * coarse POS, roots, lemmas, features — from the pinned Quranic Arabic Corpus
 * revised artifact (mustafa0x fork, Arabic script, 130k segments), offline and
 * integrity-checked at load.
 *
 * @module @deepseek-ai/dsh-tool-quran-linguistics
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { appendAuditLog, createEnvelope } from '@deepseek-ai/dsh-quran-evidence'
import { getAyahMorphology, getVerse, QAC_MORPHOLOGY } from '@deepseek-ai/dsh-quran-data'
import type { MorphSegment } from '@deepseek-ai/dsh-quran-data'

export const name = 'tool-quran-linguistics'
export const inject = ['tools']

/** Plugin configuration. */
export interface Config {
  /** Path of the append-only audit log. Defaults to `evidence-audit.jsonl` in the working directory. */
  auditLogPath?: string
}

/** One word with its morphological segments. */
export interface WordMorphology {
  readonly word: number
  readonly segments: readonly {
    readonly text: string
    readonly tag: string
    readonly root?: string
    readonly lemma?: string
    readonly features: Record<string, string>
    readonly flags: readonly string[]
  }[]
}

/** Group one ayah's segments into words. Exported for tests. */
export function groupByWord(segments: readonly MorphSegment[]): WordMorphology[] {
  const words = new Map<number, WordMorphology['segments'][number][]>()
  for (const seg of segments) {
    const list = words.get(seg.word) ?? []
    list.push({
      text: seg.text,
      tag: seg.tag,
      ...seg.features.ROOT !== undefined ? { root: seg.features.ROOT } : {},
      ...seg.features.LEM !== undefined ? { lemma: seg.features.LEM } : {},
      features: seg.features,
      flags: seg.flags,
    })
    words.set(seg.word, list)
  }
  return [...words.entries()].sort((a, b) => a[0] - b[0]).map(([word, segs]) => ({ word, segments: segs }))
}

export function apply(ctx: Context, config: Config = {}) {
  const auditLogPath = config.auditLogPath ?? 'evidence-audit.jsonl'

  ctx.tools.register(defineTool({
    name: 'quran_get_ayah_morphology',
    description: 'Get the word-by-word morphological analysis of one ayah (segments, POS tags, roots, lemmas, case/mood/person features) from the pinned Quranic Arabic Corpus revised artifact. Offline. Always show the governance card.',
    parameters: {
      surah: { type: 'number', required: true, description: 'Surah number, 1-114' },
      ayah: { type: 'number', required: true, description: 'Ayah number within the surah' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          reference: { type: 'string', required: true },
          words: { type: 'array', required: true },
          evidence: { type: 'object', additionalProperties: true, required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => {
        const words = value.words as unknown as WordMorphology[]
        const lines = words.map((w) => {
          const surface = w.segments.map(s => s.text).join('')
          const details = w.segments.map(s => `${s.text}⟨${s.tag}${s.root ? ` root:${s.root}` : ''}${s.lemma ? ` lem:${s.lemma}` : ''}⟩`).join(' + ')
          return `${w.word}. ${surface} = ${details}`
        })
        return [{
          type: 'text' as const,
          text: [`Morphology of ${value.reference}:`, ...lines, '', '[Governance card] source: Quranic Arabic Corpus v0.4 (revised, pinned) | envelope sha256 in metadata'].join('\n'),
        }]
      },
      presentationMeta: (_args, value) => ({
        reference: value.reference,
        status: 'ok',
        source: QAC_MORPHOLOGY.id,
        words: (value.words as unknown[]).length,
      }),
    },
    async execute(args) {
      const { surah, ayah } = args
      const row = await getVerse(surah, ayah)
      if (row === undefined) throw new Error(`verse ${surah}:${ayah} not found (Hafs numbering, 6236 verses)`)
      const segments = await getAyahMorphology(surah, ayah)
      if (segments.length === 0) throw new Error(`no morphology for ${surah}:${ayah} in the pinned artifact`)
      const words = groupByWord(segments)

      const evidence = createEnvelope({ reference: row.key, words }, QAC_MORPHOLOGY)
      await appendAuditLog(auditLogPath, {
        at: new Date().toISOString(),
        operation: 'quran_get_ayah_morphology',
        envelopes: [{ source: evidence.source.id, contentHash: evidence.contentHash }],
      })
      return {
        reference: row.key,
        words: JSON.parse(JSON.stringify(words)),
        evidence: JSON.parse(JSON.stringify(evidence)),
      }
    },
  }))
}
