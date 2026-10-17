/**
 * Quran text tool with mandatory evidence governance.
 *
 * The tool never serves a verse from model memory. Every call reads the pinned
 * Tanzil Uthmani artifact owned by `@deepseek-ai/dsh-quran-data`, cross-verifies the verse
 * against the independent Quran.com API (Quran Foundation), and returns an
 * evidence envelope plus the verification record. A mismatch is reported as an
 * error state in the canonical value — silent presentation of unverified text
 * is impossible by construction.
 *
 * @module @deepseek-ai/dsh-tool-quran-text
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { EvidenceEnvelope, SourceDescriptor } from '@deepseek-ai/dsh-quran-evidence'
import { appendAuditLog, createEnvelope, crossVerify } from '@deepseek-ai/dsh-quran-evidence'
import type { CrossVerification, TransformRecord } from '@deepseek-ai/dsh-quran-evidence'
import { getVerse, TANZIL_UTHMANI } from '@deepseek-ai/dsh-quran-data'

export const name = 'tool-quran-text'
export const inject = ['tools']

/** Plugin configuration. */
export interface Config {
  /** Path of the append-only audit log. Defaults to `evidence-audit.jsonl` in the working directory. */
  auditLogPath?: string
}

const TANZIL = TANZIL_UTHMANI

const QURAN_COM: SourceDescriptor = {
  id: 'quran-com-v4-uthmani',
  name: 'Quran.com API v4 (Quran Foundation) — text_uthmani',
  url: 'https://api.quran.com/api/v4',
  trust: 'L2-verified-open',
}

/** Normalization applied before cross-source comparison. */
const COMPARE_NORMALIZATION: TransformRecord = {
  id: 'quran-compare-normalize',
  detail: 'Unicode NFC + strip tatweel U+0640 and rub-el-hizb marker U+06DE + collapse whitespace + trim; for first verses (ayah 1, surah != 1) strip the leading Basmalah that Tanzil includes in the first verse but Quran.com excludes; both sides transformed identically',
}

/** Arabic combining marks (harakat, pause marks) used for skeleton comparison. */
const MARKS_RUN = /[ؐ-ًؚ-ٰٟۖ-ۭ]+/g

/**
 * Strip the leading Basmalah that Tanzil includes in first verses (ayah 1,
 * surah != 1) but Quran.com excludes. Detected on word skeletons (marks
 * removed) so Tanzil variants like the shadda-bearing بِّسْمِ also match.
 */
function stripLeadingBasmalahWords(n: string): string {
  const skeleton = (w: string) => w.replace(MARKS_RUN, '').replace(/[ٱأإآ]/g, 'ا')
  const BASMALAH_SKELETON = ['بسم', 'الله', 'الرحمن', 'الرحيم']
  const words = n.split(' ')
  if (words.length > 4 && BASMALAH_SKELETON.every((w, i) => i < words.length && skeleton(words[i] ?? '') === w)) {
    return words.slice(4).join(' ')
  }
  return n
}

function normalizeForCompare(text: string, stripBasmalah: boolean): string {
  let n = text.normalize('NFC').replace(/[ـ۞۩]/g, '').replace(/\s+/g, ' ').trim()
  // Canonicalize combining-mark order: sort each mark run by code point
  n = n.replace(MARKS_RUN, run => [...run].sort().join(''))
  if (stripBasmalah) n = stripLeadingBasmalahWords(n)
  return n
}

/** Fetch the same verse from the independent Quran.com API (Quran Foundation). */
async function fetchCrossSource(surah: number, ayah: number, signal: AbortSignal): Promise<string> {
  const res = await fetch(`${QURAN_COM.url}/quran/verses/uthmani?verse_key=${surah}:${ayah}`, { signal })
  if (!res.ok) throw new Error(`Quran.com API responded ${res.status}`)
  const body = await res.json() as { verses?: { text_uthmani?: string }[] }
  const text = body.verses?.[0]?.text_uthmani
  if (typeof text !== 'string') throw new Error(`Quran.com API returned no verse text for ${surah}:${ayah}`)
  return text
}

/** Canonical result of quran_get_verse. */
export interface QuranVerseResult {
  /** The verse text — only present when cross-verification matched. */
  readonly text?: string | undefined
  /** Surah and ayah reference, e.g. `1:1`. */
  readonly reference: string
  /** Evidence envelope of the primary (Tanzil) payload. */
  readonly evidence: EvidenceEnvelope<string>
  /** Cross-verification record against the independent source. */
  readonly verification: CrossVerification
  /** `ok` only when the two sources agree; `mismatch` blocks silent display. */
  readonly status: 'ok' | 'mismatch'
}

export function apply(ctx: Context, config: Config = {}) {
  const auditLogPath = config.auditLogPath ?? 'evidence-audit.jsonl'

  ctx.tools.register(defineTool({
    name: 'quran_get_verse',
    description: 'Fetch a Quran verse (Uthmani script, Hafs) from the pinned Tanzil artifact, mandatorily cross-verified against an independent second source. NEVER quote a verse from memory; always use this tool. The result carries an evidence envelope (source, SHA-256 hash, timestamp) and a verification verdict that MUST be shown to the user as a governance card.',
    parameters: {
      surah: { type: 'number', required: true, description: 'Surah number, 1-114' },
      ayah: { type: 'number', required: true, description: 'Ayah number within the surah' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          reference: { type: 'string', required: true },
          status: { type: 'string', required: true },
          evidence: { type: 'object', additionalProperties: true, required: true },
          verification: { type: 'object', additionalProperties: true, required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => {
        const evidence = value.evidence as unknown as EvidenceEnvelope<string>
        const verification = value.verification as unknown as CrossVerification
        return [{
          type: 'text' as const,
          text: value.status === 'ok'
            ? `${value.reference}: ${value.text}\n\n[Governance card] source: ${evidence.source.name} | sha256: ${evidence.contentHash.slice(0, 16)}… | fetched: ${evidence.retrievedAt} | verification: ${verification.verdict}`
            : `Cross-verification FAILED for ${value.reference}. ${verification.verdict}. The verse is withheld; do not quote it.`,
        }]
      },
      presentationMeta: (_args, value) => {
        const evidence = value.evidence as unknown as EvidenceEnvelope<string>
        const verification = value.verification as unknown as CrossVerification
        return {
          reference: value.reference,
          status: value.status,
          source: evidence.source.id,
          contentHash: evidence.contentHash,
          retrievedAt: evidence.retrievedAt,
          verdict: verification.verdict,
        }
      },
    },
    async execute(args, exec) {
      const { surah, ayah } = args
      if (!Number.isInteger(surah) || surah < 1 || surah > 114) throw new Error('surah must be an integer in 1..114')
      if (!Number.isInteger(ayah) || ayah < 1) throw new Error('ayah must be a positive integer')

      const row = await getVerse(surah, ayah)
      if (row === undefined) throw new Error(`verse ${surah}:${ayah} not found in Tanzil artifact`)
      const localText = row.text

      const stripBasmalah = ayah === 1 && surah !== 1
      const localEnvelope = createEnvelope(normalizeForCompare(localText, stripBasmalah), TANZIL, [COMPARE_NORMALIZATION])
      const remoteText = await fetchCrossSource(surah, ayah, exec.signal)
      const remoteEnvelope = createEnvelope(normalizeForCompare(remoteText, stripBasmalah), QURAN_COM, [COMPARE_NORMALIZATION])
      const verification = crossVerify(localEnvelope, remoteEnvelope, COMPARE_NORMALIZATION)

      // The canonical tool value must be plain JSON; clone the typed records.
      const result = {
        ...(verification.match ? { text: localText } : {}),
        reference: `${surah}:${ayah}`,
        evidence: JSON.parse(JSON.stringify(createEnvelope(localText, TANZIL))),
        verification: JSON.parse(JSON.stringify(verification)),
        status: verification.match ? 'ok' : 'mismatch',
      }

      await appendAuditLog(auditLogPath, {
        at: new Date().toISOString(),
        operation: 'quran_get_verse',
        envelopes: [
          { source: localEnvelope.source.id, contentHash: localEnvelope.contentHash },
          { source: remoteEnvelope.source.id, contentHash: remoteEnvelope.contentHash },
        ],
        verification,
      })

      return result
    },
  }))
}
