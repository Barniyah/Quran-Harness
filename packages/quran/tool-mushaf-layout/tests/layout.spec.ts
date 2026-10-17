/**
 * Page-composition tests: known page facts (page 1 = Al-Fatiha, page 2 starts
 * Al-Baqara, page 604 ends with An-Nas) and full-coverage integrity.
 */
import { describe, expect, it } from 'vitest'
import { buildPageIndex, getPageComposition, PAGE_COUNT } from '@deepseek-ai/dsh-tool-mushaf-layout'

describe('quran_get_page_layout', () => {
  it('page 1 is Al-Fatiha whole', () => {
    expect(getPageComposition(1)).toEqual([{ surah: 1, fromAyah: 1, toAyah: 7 }])
  })

  it('page 2 starts Al-Baqara at ayah 1', () => {
    const spans = getPageComposition(2)!
    expect(spans[0]).toEqual({ surah: 2, fromAyah: 1, toAyah: 5 })
  })

  it('last page 604 ends with An-Nas whole', () => {
    const spans = getPageComposition(604)!
    expect(spans[spans.length - 1]).toEqual({ surah: 114, fromAyah: 1, toAyah: 6 })
  })

  it('the index covers all 604 pages and every ayah exactly once', () => {
    const index = buildPageIndex()
    expect(index).toHaveLength(PAGE_COUNT)
    let covered = 0
    for (const spans of index) for (const s of spans) covered += s.toAyah - s.fromAyah + 1
    expect(covered).toBe(6236)
  })

  it('rejects out-of-range pages', () => {
    expect(getPageComposition(0)).toBeUndefined()
    expect(getPageComposition(605)).toBeUndefined()
  })
})
