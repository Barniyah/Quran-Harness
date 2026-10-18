/**
 * Linguistics tests over the pinned QAC revised artifact: known analyses of
 * 1:1 (بِ + سْمِ with root سمو, ٱللَّهِ PN with root أله) must come out of the
 * data, and the artifact must cover the corpus scale.
 */
import { describe, expect, it } from 'vitest'
import { getAyahMorphology, loadMorphology } from '@deepseek-ai/dsh-quran-data'
import { groupByWord } from '@deepseek-ai/dsh-tool-quran-linguistics'

describe('quran_get_ayah_morphology', () => {
  it('loads the pinned artifact at corpus scale', async () => {
    const rows = await loadMorphology()
    expect(rows.length).toBeGreaterThan(120_000) // ~130k segments
  })

  it('analyzes 1:1: word 1 = بِ (PREF) + سْمِ (root سمو)', async () => {
    const segments = await getAyahMorphology(1, 1)
    const words = groupByWord(segments)
    expect(words[0]!.segments).toHaveLength(2)
    expect(words[0]!.segments[0]!.text).toBe('بِ')
    expect(words[0]!.segments[1]!.root).toBe('سمو')
  })

  it('analyzes 1:1: word 2 = ٱللَّهِ noun with root أله (revised fork tags it N)', async () => {
    const segments = await getAyahMorphology(1, 1)
    const allah = segments.find(s => s.word === 2) // text shape differs between my keyboard and the artifact; locate by position
    expect(allah).toBeDefined()
    expect(allah!.tag).toBe('N')
    expect(allah!.features.ROOT).toBe('أله')
  })

  it('covers a late verse (114:6) too', async () => {
    const segments = await getAyahMorphology(114, 6)
    expect(segments.length).toBeGreaterThan(0)
  })
})
