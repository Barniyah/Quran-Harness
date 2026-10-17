/**
 * Timing tests over the pinned Husary artifact: integrity, convention
 * correctness (intro segment handling), monotonicity, and audio alignment.
 */
import { describe, expect, it } from 'vitest'
import { ayahTiming, loadHusaryTiming } from '@deepseek-ai/dsh-quran-data'
import { everyAyahUrl } from '@deepseek-ai/dsh-tool-quran-audio'

describe('quran_get_ayah_timing', () => {
  it('loads the pinned artifact: 114 surahs, integrity-verified', async () => {
    const timing = await loadHusaryTiming()
    expect(Object.keys(timing.surahs)).toHaveLength(114)
    expect(timing.unit).toBe('ms')
  })

  it('surah 1 has no intro segment (basmalah IS ayah 1)', async () => {
    const timing = await loadHusaryTiming()
    expect(timing.surahs['1']!.introSegment).toBe(false)
    expect(timing.surahs['1']!.ayahEndMs).toHaveLength(7)
  })

  it('other surahs document the dropped intro segment', async () => {
    const timing = await loadHusaryTiming()
    expect(timing.surahs['2']!.introSegment).toBe(true)
    expect(timing.surahs['2']!.ayahEndMs).toHaveLength(286)
    expect(timing.surahs['9']!.introSegment).toBe(true)
    expect(timing.surahs['9']!.ayahEndMs).toHaveLength(129)
  })

  it('ayah 1 starts at 0 and ends at the first end mark', async () => {
    const timing = await loadHusaryTiming()
    const span = ayahTiming(timing, 1, 1)
    expect(span).toEqual({ startMs: 0, endMs: 11705, durationMs: 11705 })
  })

  it('every surah is strictly monotonic', async () => {
    const timing = await loadHusaryTiming()
    for (const block of Object.values(timing.surahs)) {
      for (let i = 1; i < block.ayahEndMs.length; i++) {
        expect(block.ayahEndMs[i]! > block.ayahEndMs[i - 1]!).toBe(true)
      }
    }
  })

  it('the matching audio URL targets the Husary EveryAyah folder', () => {
    expect(everyAyahUrl('Husary_128kbps', 1, 1)).toBe('https://everyayah.com/data/Husary_128kbps/001001.mp3')
  })
})
