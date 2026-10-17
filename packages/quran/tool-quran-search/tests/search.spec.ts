/**
 * Offline search tests over the pinned Tanzil artifacts: skeleton leniency via
 * the Imla'ei corpus, exact-mode strictness on the Uthmani corpus, surah
 * filtering, and hit integrity. No network.
 */
import { describe, expect, it } from 'vitest'
import { loadImlaeiVerses, loadUthmaniVerses, toSearchSkeleton } from '@deepseek-ai/dsh-quran-data'
import { searchVerses } from '@deepseek-ai/dsh-tool-quran-search'

async function corpora() {
  const [uthmani, imlaei] = await Promise.all([loadUthmaniVerses(), loadImlaeiVerses()])
  return { uthmani, imlaei }
}

describe('quran_search', () => {
  it('skeleton mode finds the Fatiha opening typed without harakat', async () => {
    const { uthmani, imlaei } = await corpora()
    const result = searchVerses(uthmani, imlaei, 'بسم الله الرحمن الرحيم', 'skeleton', 1, 5)
    expect(result.totalMatches).toBeGreaterThanOrEqual(1)
    expect(result.hits.some(h => h.key === '1:1')).toBe(true)
  })

  it('skeleton mode finds العالمين spelled the modern way (Imla\\u2019ei corpus)', async () => {
    const { uthmani, imlaei } = await corpora()
    const result = searchVerses(uthmani, imlaei, 'الحمد لله رب العالمين', 'skeleton', undefined, 10)
    expect(result.hits.some(h => h.key === '1:2')).toBe(true)
  })

  it('skeleton hits return the untouched Uthmani text, not the Imla\\u2019ei row', async () => {
    const { uthmani, imlaei } = await corpora()
    const result = searchVerses(uthmani, imlaei, 'الحمد لله رب العالمين', 'skeleton', 1, 1)
    const hit = result.hits.find(h => h.key === '1:2')
    expect(hit).toBeDefined()
    expect(hit!.text).toContain('ٱلْحَمْدُ') // Uthmani orthography with alef-wasla
  })

  it('skeleton mode unifies hamza-on-alef with bare alef', async () => {
    const { uthmani, imlaei } = await corpora()
    const result = searchVerses(uthmani, imlaei, 'قل هو الله احد', 'skeleton', 112, 5)
    expect(result.hits.some(h => h.key === '112:1')).toBe(true)
  })

  it('exact mode does NOT match plain spelling against Uthmani text', async () => {
    const { uthmani, imlaei } = await corpora()
    const result = searchVerses(uthmani, imlaei, 'الحمد لله', 'exact', 1, 5)
    expect(result.totalMatches).toBe(0)
  })

  it('exact mode matches a substring taken verbatim from the artifact', async () => {
    const { uthmani, imlaei } = await corpora()
    const verse12 = uthmani.find(v => v.key === '1:2')!
    const probe = verse12.text.split(' ').slice(0, 2).join(' ')
    const result = searchVerses(uthmani, imlaei, probe, 'exact', 1, 5)
    expect(result.hits.some(h => h.key === '1:2')).toBe(true)
  })

  it('returned hits never exceed the limit', async () => {
    const { uthmani, imlaei } = await corpora()
    const result = searchVerses(uthmani, imlaei, 'الله', 'skeleton', undefined, 3)
    expect(result.returned).toBe(3)
    expect(result.totalMatches).toBeGreaterThan(100)
  })

  it('skeleton transform is symmetric and deterministic', () => {
    expect(toSearchSkeleton('ٱلرَّحْمَٰنِ')).toBe(toSearchSkeleton('الرحمن'))
  })
})
