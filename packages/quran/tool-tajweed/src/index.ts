/**
 * Tajweed analysis tool: per-letter tajweed rule markers for any ayah via the
 * deterministic, rule-based tajweed-embeddings engine (no ML model — pure
 * rule classification over the engine's own pinned Tanzil Uthmani copy).
 *
 * The engine runs in Python; this tool bridges through a small CLI script and
 * wraps the analysis in the mandatory evidence envelope. Verse validity is
 * checked against the harness's own pinned Tanzil artifact first.
 *
 * Requires: `pip install tajweed-embeddings` in the configured Python.
 *
 * @module @deepseek-ai/dsh-tool-tajweed
 */

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { SourceDescriptor } from '@deepseek-ai/dsh-quran-evidence'
import { appendAuditLog, createEnvelope } from '@deepseek-ai/dsh-quran-evidence'
import { getVerse } from '@deepseek-ai/dsh-quran-data'

export const name = 'tool-tajweed'
export const inject = ['tools']

/** Plugin configuration. */
export interface Config {
  /** Python interpreter with tajweed-embeddings installed. Defaults to the project venv, then `python`. */
  pythonPath?: string
  /** Path of the append-only audit log. Defaults to `evidence-audit.jsonl` in the working directory. */
  auditLogPath?: string
  /** Bridge timeout in ms (engine first-load builds its index). Default 120000. */
  timeoutMs?: number
}

const TAJWEED_EMBEDDINGS: SourceDescriptor = {
  id: 'tajweed-embeddings',
  name: 'tajweed-embeddings engine (tarekeldeeb) — rule-based, deterministic',
  url: 'https://github.com/tarekeldeeb/tajweed-embeddings',
  trust: 'L3-community',
  version: '2.0.0',
}

const MODULE_DIR = dirname(fileURLToPath(import.meta.url))
const CLI_SCRIPT = join(MODULE_DIR, '../python/tajweed_cli.py')

/**
 * Resolve the Python interpreter portably across machines and operating systems:
 * 1. `QURAN_PYTHON_PATH` environment variable (if set)
 * 2. Nearest `.venv` walking up from the package directory (`.venv/Scripts/python.exe` on Windows, `.venv/bin/python` on POSIX)
 * 3. System `python3` / `python` fallback
 */
export function resolveDefaultPython(): string {
  if (process.env.QURAN_PYTHON_PATH) return process.env.QURAN_PYTHON_PATH
  const binRel = process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python'
  let current = MODULE_DIR
  for (let i = 0; i < 8; i++) {
    const candidate = join(current, binRel)
    if (existsSync(candidate)) return candidate
    const parent = resolve(current, '..')
    if (parent === current) break
    current = parent
  }
  return process.platform === 'win32' ? 'python' : 'python3'
}

const DEFAULT_PYTHON = resolveDefaultPython()

const execFileAsync = promisify(execFile)

/** Per-letter tajweed analysis of one verse. */
export interface TajweedAnalysis {
  readonly surah: number
  readonly ayah: number
  readonly text: string
  readonly style: string
  readonly letters: readonly string[]
}

/** Run the Python bridge. Exported for tests. */
export async function analyzeVerse(
  surah: number,
  ayah: number,
  pythonPath: string,
  timeoutMs = 120_000,
  signal?: AbortSignal,
): Promise<TajweedAnalysis> {
  const { stdout } = await execFileAsync(
    pythonPath,
    [CLI_SCRIPT, String(surah), String(ayah), 'short'],
    { timeout: timeoutMs, ...(signal !== undefined ? { signal } : {}), maxBuffer: 4 * 1024 * 1024 },
  )
  const parsed = JSON.parse(stdout) as TajweedAnalysis & { error?: string }
  if (parsed.error) throw new Error(parsed.error)
  return parsed
}

export function apply(ctx: Context, config: Config = {}) {
  const auditLogPath = config.auditLogPath ?? 'evidence-audit.jsonl'
  const pythonPath = config.pythonPath ?? DEFAULT_PYTHON

  ctx.tools.register(defineTool({
    name: 'quran_analyze_tajweed',
    description: 'Analyze the tajweed rules of one ayah letter by letter (harakat, sifat, rule markers like hamzat_wasl, madd, ghunna) using the deterministic tajweed-embeddings rule engine — no ML model. Offline. Always show the governance card.',
    parameters: {
      surah: { type: 'number', required: true, description: 'Surah number, 1-114' },
      ayah: { type: 'number', required: true, description: 'Ayah number within the surah' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          analysis: { type: 'object', additionalProperties: true, required: true },
          evidence: { type: 'object', additionalProperties: true, required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => {
        const a = value.analysis as unknown as TajweedAnalysis
        return [{
          type: 'text' as const,
          text: [`Tajweed analysis of ${a.surah}:${a.ayah} — ${a.letters.length} letters (deterministic rule engine):`, a.text, '', ...a.letters.slice(0, 40), a.letters.length > 40 ? `… (${a.letters.length - 40} more letters in the structured result)` : '', '', '[Governance card] source: tajweed-embeddings (rule-based) | envelope in metadata'].join('\n'),
        }]
      },
      presentationMeta: (_args, value) => {
        const a = value.analysis as unknown as TajweedAnalysis
        return {
          reference: `${a.surah}:${a.ayah}`,
          status: 'ok',
          source: TAJWEED_EMBEDDINGS.id,
          letters: a.letters.length,
        }
      },
    },
    async execute(args, exec) {
      const { surah, ayah } = args
      const row = await getVerse(surah, ayah)
      if (row === undefined) throw new Error(`verse ${surah}:${ayah} not found (Hafs numbering, 6236 verses)`)

      const analysis = await analyzeVerse(surah, ayah, pythonPath, config.timeoutMs ?? 120_000, exec.signal)
      const evidence = createEnvelope(analysis, TAJWEED_EMBEDDINGS)
      await appendAuditLog(auditLogPath, {
        at: new Date().toISOString(),
        operation: 'quran_analyze_tajweed',
        envelopes: [{ source: evidence.source.id, contentHash: evidence.contentHash }],
      })
      return {
        analysis: JSON.parse(JSON.stringify(analysis)),
        evidence: JSON.parse(JSON.stringify(evidence)),
      }
    },
  }))
}
