/**
 * Audio tool tests: URL construction (offline) and one live probe against
 * EveryAyah to prove the recorded availability evidence is real.
 */
import { describe, expect, it } from 'vitest'
import { everyAyahUrl, probeUrl } from '@deepseek-ai/dsh-tool-quran-audio'

describe('quran_get_audio', () => {
  it('builds the canonical EveryAyah verse URL', () => {
    expect(everyAyahUrl('Alafasy_128kbps', 1, 1)).toBe('https://everyayah.com/data/Alafasy_128kbps/001001.mp3')
    expect(everyAyahUrl('Alafasy_128kbps', 114, 6)).toBe('https://everyayah.com/data/Alafasy_128kbps/114006.mp3')
    expect(everyAyahUrl('Abdul_Basit_Murattal_64kbps', 2, 255)).toBe('https://everyayah.com/data/Abdul_Basit_Murattal_64kbps/002255.mp3')
  })

  it('live probe confirms the default reciter serves 1:1 (network)', async () => {
    const probe = await probeUrl(everyAyahUrl('Alafasy_128kbps', 1, 1))
    expect(probe.httpStatus).toBe(200)
    expect(probe.ok).toBe(true)
    expect(probe.contentType).toContain('audio')
    expect(probe.probedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  }, 30000)

  it('live probe reports a nonexistent reciter honestly', async () => {
    const probe = await probeUrl(everyAyahUrl('No_Such_Reciter_XYZ', 1, 1))
    expect(probe.ok).toBe(false)
    expect(probe.httpStatus).not.toBe(200)
  }, 30000)
})
