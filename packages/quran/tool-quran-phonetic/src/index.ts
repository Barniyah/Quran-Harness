/**
 * Quran phonetic script tool (الرسم الصوتي): converts an ayah from Uthmani
 * script to its phonetic script (how it is actually recited: madd, ghunna,
 * idgham, qalqala...) via quran-transcript with explicit Hafs rules.
 *
 * The input text comes from the harness's own pinned Tanzil artifact, so the
 * transform chain is fully auditable: pinned artifact → quran-transcript
 * (documented rules) → phonemes + per-letter sifat.
 *
 * Requires: `pip install quran-transcript` in the configured Python.
 *
 * @module @deepseek-ai/dsh-tool-quran-phonetic
 */

import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { SourceDescriptor, TransformRecord } from '@deepseek-ai/dsh-quran-evidence'
import { appendAuditLog, createEnvelope } from '@deepseek-ai/dsh-quran-evidence'
import { getVerse } from '@deepseek-ai/dsh-quran-data'

export const name = 'tool-quran-phonetic'
export const inject = ['tools']

/** Plugin configuration. */
export interface Config {
  /** Python interpreter with quran-transcript installed. Defaults to the project venv, then `python`. */
  pythonPath?: string
  /** Path of the append-only audit log. Defaults to `evidence-audit.jsonl` in the working directory. */
  auditLogPath?: string
  /** Bridge timeout in ms. Default 60000. */
  timeoutMs?: number
}

const QURAN_TRANSCRIPT: SourceDescriptor = {
  id: 'quran-transcript',
  name: 'quran-transcript (obadx) — phonetic script engine, rule-based',
  url: 'https://github.com/obadx/quran-transcript',
  trust: 'L3-community',
  version: '0.6.4',
}

/** The declared Uthmani→phonetic transform. */
const PHONETIC_TRANSFORM: TransformRecord = {
  id: 'uthmani-to-phonetic-quran-transcript',
  detail: 'Input = pinned Tanzil Uthmani artifact text (SHA-256-verified). Engine = quran-transcript quran_phonetizer with Hafs rules (madd_monfasel/mottasel/mottasel_waqf/aared = 4). Output = phonemes + per-letter sifat.',
}

const CLI_SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '../python/phonetic_cli.py')
const DEFAULT_PYTHON = 'D:/Projects/DeepSeek_Quran_Harness/.venv/Scripts/python.exe'

const execFileAsync = promisify(execFile)

/** Phonetic rendering of one verse. */
export interface PhoneticResult {
  readonly suraIdx: number
  readonly uthmani: string
  readonly phonemes: string
  readonly sifat: readonly Record<string, unknown>[]
  readonly rules: Record<string, unknown>
}

/** Run the Python bridge, feeding the verse text via stdin. Exported for tests. */
export async function phonetize(
  surah: number,
  uthmaniText: string,
  pythonPath: string,
  timeoutMs = 60_000,
  signal?: AbortSignal,
): Promise<PhoneticResult> {
  const child = execFileAsync(
    pythonPath,
    [CLI_SCRIPT, String(surah)],
    { timeout: timeoutMs, ...(signal !== undefined ? { signal } : {}), maxBuffer: 4 * 1024 * 1024 },
  )
  child.child.stdin?.write(uthmaniText)
  child.child.stdin?.end()
  const { stdout } = await child
  const parsed = JSON.parse(stdout) as PhoneticResult & { error?: string }
  if (parsed.error) throw new Error(parsed.error)
  return parsed
}

export function apply(ctx: Context, config: Config = {}) {
  const auditLogPath = config.auditLogPath ?? 'evidence-audit.jsonl'
  const pythonPath = config.pythonPath ?? DEFAULT_PYTHON

  ctx.tools.register(defineTool({
    name: 'quran_phonetize',
    description: 'Convert one ayah from Uthmani script to its phonetic script (الرسم الصوتي — actual recitation form: madd, ghunna, idgham, qalqala) with the per-letter sifat table, via the rule-based quran-transcript engine (Hafs). Offline; input is the pinned Tanzil artifact. Always show the governance card.',
    parameters: {
      surah: { type: 'number', required: true, description: 'Surah number, 1-114' },
      ayah: { type: 'number', required: true, description: 'Ayah number within the surah' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          reference: { type: 'string', required: true },
          phonetic: { type: 'object', additionalProperties: true, required: true },
          evidence: { type: 'object', additionalProperties: true, required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => {
        const p = value.phonetic as unknown as PhoneticResult
        return [{
          type: 'text' as const,
          text: [`الرسم الصوتي لـ ${value.reference}:`, `عثماني: ${p.uthmani}`, `صوتي: ${p.phonemes}`, `(${p.sifat.length} حرفًا بجدول الصفات في النتيجة المهيكلة)`, '', '[Governance card] transform: pinned Tanzil → quran-transcript (hafs) | envelope in metadata'].join('\n'),
        }]
      },
      presentationMeta: (_args, value) => ({
        reference: value.reference,
        status: 'ok',
        source: QURAN_TRANSCRIPT.id,
      }),
    },
    async execute(args, exec) {
      const { surah, ayah } = args
      const row = await getVerse(surah, ayah)
      if (row === undefined) throw new Error(`verse ${surah}:${ayah} not found (Hafs numbering, 6236 verses)`)

      const phonetic = await phonetize(surah, row.text, pythonPath, config.timeoutMs ?? 60_000, exec.signal)
      const evidence = createEnvelope(
        { reference: row.key, uthmani: row.text, phonemes: phonetic.phonemes },
        QURAN_TRANSCRIPT,
        [PHONETIC_TRANSFORM],
      )
      await appendAuditLog(auditLogPath, {
        at: new Date().toISOString(),
        operation: 'quran_phonetize',
        envelopes: [{ source: evidence.source.id, contentHash: evidence.contentHash }],
      })
      return {
        reference: row.key,
        phonetic: JSON.parse(JSON.stringify(phonetic)),
        evidence: JSON.parse(JSON.stringify(evidence)),
      }
    },
  }))
}
