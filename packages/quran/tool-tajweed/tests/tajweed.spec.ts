/**
 * Tajweed tool tests: the Python bridge returns per-letter analysis for known
 * verses, and the deterministic markers (e.g. hamzat_wasl) appear where they
 * must. Requires the project venv with tajweed-embeddings — skipped cleanly
 * when absent.
 */
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { analyzeVerse, resolveDefaultPython } from '@deepseek-ai/dsh-tool-tajweed'

const PYTHON = resolveDefaultPython()
const available = existsSync(PYTHON)

describe('quran_analyze_tajweed', () => {
  it.skipIf(!available)('analyzes 1:1 letter by letter (deterministic engine)', async () => {
    const result = await analyzeVerse(1, 1, PYTHON)
    expect(result.text).toContain('بِسْمِ')
    expect(result.letters.length).toBeGreaterThan(10)
    expect(result.letters[0]).toContain('ب')
  }, 120_000)

  it.skipIf(!available)('marks hamzat wasl in ٱلله of 112:1', async () => {
    const result = await analyzeVerse(112, 1, PYTHON)
    expect(result.letters.some(l => l.includes('hamzat_wasl'))).toBe(true)
  }, 120_000)

  it.skipIf(!available)('is deterministic: two runs produce identical output', async () => {
    const [a, b] = await Promise.all([analyzeVerse(1, 5, PYTHON), analyzeVerse(1, 5, PYTHON)])
    expect(a.letters).toEqual(b.letters)
  }, 180_000)
})
