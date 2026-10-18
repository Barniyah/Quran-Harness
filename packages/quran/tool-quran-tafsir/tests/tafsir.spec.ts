/**
 * Tafsir tests: edition URL construction (offline) and live fetches proving
 * named editions serve real ayah tafsir (Ibn Kathir Arabic on 1:2, Muyassar).
 */
import { describe, expect, it } from 'vitest'
import { fetchTafsir, TAFSIR_EDITIONS, tafsirUrl } from '@deepseek-ai/dsh-tool-quran-tafsir'

describe('quran_get_tafsir', () => {
  it('builds the canonical CDN URL per edition', () => {
    expect(tafsirUrl('ar-tafsir-ibn-kathir', 2, 255)).toBe('https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/2/255.json')
  })

  it('pins five probed editions (4 Arabic + 1 English)', () => {
    expect(Object.keys(TAFSIR_EDITIONS)).toHaveLength(5)
    expect(TAFSIR_EDITIONS['ar-tafsir-ibn-kathir']).toContain('ابن كثير')
  })

  it('fetches Ibn Kathir Arabic tafsir for 1:2 (network)', async () => {
    const text = await fetchTafsir('ar-tafsir-ibn-kathir', 1, 2)
    expect(text.length).toBeGreaterThan(50)
    expect(text).toContain('الحمد')
  }, 30000)

  it('fetches the Muyassar tafsir for 112:1 (network)', async () => {
    const text = await fetchTafsir('ar-tafsir-muyassar', 112, 1)
    expect(text.length).toBeGreaterThan(20)
  }, 30000)

  it('rejects an unknown edition path as 404 from the CDN', async () => {
    await expect(fetchTafsir('no-such-edition' as never, 1, 1)).rejects.toThrow('404')
  }, 30000)
})
