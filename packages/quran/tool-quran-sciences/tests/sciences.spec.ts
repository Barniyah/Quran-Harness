/**
 * Sciences tests over the pinned Quranpedia catalog: scale, known topics with
 * their verse references, and skeleton-tolerant search. Offline.
 */
import { describe, expect, it } from 'vitest'
import { loadTopics, searchTopics } from '@deepseek-ai/dsh-quran-data'

describe('quran_search_topics', () => {
  it('loads the pinned catalog: 6100 topics, 4574 with verse references', async () => {
    const topics = await loadTopics()
    expect(topics).toHaveLength(6100)
    expect(topics.filter(t => t.ayahs)).toHaveLength(4574)
  })

  it('finds الريش with its verse reference 7:26', async () => {
    const topics = await loadTopics()
    const matched = searchTopics(topics, 'الريش')
    expect(matched.some(t => t.name.includes('رِّيش') || t.name.includes('الريش') || t.ayahs === '7:26')).toBe(true)
    const riish = matched.find(t => t.ayahs === '7:26')
    expect(riish).toBeDefined()
  })

  it('tolerates harakat-free queries (skeleton match)', async () => {
    const topics = await loadTopics()
    const withMarks = searchTopics(topics, 'الصلاة')
    expect(withMarks.length).toBeGreaterThan(0)
    expect(withMarks.some(t => t.name.includes('صَّل')) || withMarks.some(t => t.name.includes('صلاة'))).toBe(true)
  })

  it('returns empty for an empty query and caps results', async () => {
    const topics = await loadTopics()
    expect(searchTopics(topics, '   ')).toEqual([])
    expect(searchTopics(topics, 'ا', 5).length).toBeLessThanOrEqual(5)
  })
})
