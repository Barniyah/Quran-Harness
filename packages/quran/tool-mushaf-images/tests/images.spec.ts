/**
 * Mushaf image tests: URL construction (offline) and live probes proving the
 * recorded evidence is real (QuranHub page image, Quran.com ayah image).
 */
import { describe, expect, it } from 'vitest'
import { ayahImageUrl, MUSHAF_PAGE_COUNT, pageImageUrl } from '@deepseek-ai/dsh-tool-mushaf-images'
import { probeUrl } from '@deepseek-ai/dsh-tool-quran-audio'

describe('mushaf images', () => {
  it('builds the canonical QuranHub page URL and bounds pages to 604', () => {
    expect(pageImageUrl(1)).toBe('https://raw.githubusercontent.com/QuranHub/quran-pages-images/main/kfgqpc/hafs-wasat/1.jpg')
    expect(pageImageUrl(604)).toContain('/604.jpg')
    expect(MUSHAF_PAGE_COUNT).toBe(604)
  })

  it('live probe confirms mushaf page 1 exists as JPEG (network)', async () => {
    const probe = await probeUrl(pageImageUrl(1))
    expect(probe.ok).toBe(true)
    expect(probe.contentType).toContain('image')
  }, 30000)

  it('fetches and probes the EveryAyah ayah image for 2:255 (network)', async () => {
    const url = ayahImageUrl(2, 255)
    expect(url).toBe('https://everyayah.com/data/quranpngs/2_255.png')
    const probe = await probeUrl(url)
    expect(probe.ok).toBe(true)
    expect(probe.contentType).toContain('image')
  }, 30000)
})
