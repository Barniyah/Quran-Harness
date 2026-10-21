/**
 * Phonetic tool tests: the bridge phonetizes the pinned artifact text of 1:1
 * and 112:1 with the declared Hafs rules, and the output is deterministic.
 * Requires the project venv with quran-transcript — skipped cleanly when absent.
 */
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getVerse } from '@deepseek-ai/dsh-quran-data'
import { phonetize, resolveDefaultPython } from '@deepseek-ai/dsh-tool-quran-phonetic'

const PYTHON = resolveDefaultPython()
const available = existsSync(PYTHON)

describe('quran_phonetize', () => {
  it.skipIf(!available)('phonetizes 1:1 from the pinned artifact text', async () => {
    const row = await getVerse(1, 1)
    const result = await phonetize(1, row!.text, PYTHON)
    expect(result.uthmani).toBe(row!.text)
    expect(result.phonemes.length).toBeGreaterThan(10)
    expect(result.sifat.length).toBeGreaterThan(10)
    expect(result.rules.rewaya).toBe('hafs')
  }, 90_000)

  it.skipIf(!available)('the sifat table carries real attributes (jahr/shadeed/…)', async () => {
    const row = await getVerse(1, 1)
    const result = await phonetize(1, row!.text, PYTHON)
    const first = result.sifat[0] as Record<string, unknown>
    expect(first).toHaveProperty('hams_or_jahr')
    expect(first).toHaveProperty('shidda_or_rakhawa')
    expect(first).toHaveProperty('qalqla')
  }, 90_000)

  it.skipIf(!available)('is deterministic across runs', async () => {
    const row = await getVerse(112, 1)
    const [a, b] = await Promise.all([
      phonetize(112, row!.text, PYTHON),
      phonetize(112, row!.text, PYTHON),
    ])
    expect(a.phonemes).toBe(b.phonemes)
  }, 120_000)
})
