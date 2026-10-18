/**
 * Translation tests: known-resource labels (offline) and a live Quran.com
 * fetch returning the Abdel Haleem text for 1:1.
 */
import { describe, expect, it } from 'vitest'
import { fetchTranslations, KNOWN_TRANSLATIONS } from '@deepseek-ai/dsh-tool-quran-translations'

describe('quran_get_translation', () => {
  it('pins the well-known translation resources', () => {
    expect(KNOWN_TRANSLATIONS[85]).toContain('Abdel Haleem')
    expect(KNOWN_TRANSLATIONS[20]).toContain('Saheeh')
  })

  it('fetches Abdel Haleem for 1:1 with the translator named (network)', async () => {
    const rows = await fetchTranslations(1, 1, [85])
    expect(rows).toHaveLength(1)
    expect(rows[0]!.resourceId).toBe(85)
    expect(rows[0]!.resourceName).toContain('Abdel Haleem')
    expect(rows[0]!.text).toContain('In the name of God')
  }, 30000)

  it('fetches two translations in one call (network)', async () => {
    const rows = await fetchTranslations(112, 1, [85, 20])
    expect(rows).toHaveLength(2)
    expect(rows.map(r => r.resourceId).sort()).toEqual([20, 85]) // API returns its own ordering
  }, 30000)
})
