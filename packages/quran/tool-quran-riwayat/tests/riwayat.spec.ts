/**
 * Riwayat comparison tests: the known structural facts (hafs 6236 vs warsh
 * 6214 ayahs; surah 2: 286 vs 285) must come out of the data, and the Hafs
 * baseline stays intact.
 */
import { describe, expect, it } from 'vitest'
import { compareRiwayat, convertAyahBetween } from '@deepseek-ai/dsh-tool-quran-riwayat'

describe('quran_compare_riwayat', () => {
  it('covers all 8 riwayat', () => {
    const rows = compareRiwayat(1)
    expect(rows.map(r => r.riwaya)).toEqual(['hafs', 'warsh', 'qalun', 'shuba', 'douri', 'sousi', 'bazzi', 'qunbul'])
  })

  it('reflects the documented totals: hafs/shuba 6236, warsh/qalun 6214, douri/sousi 6217, bazzi/qunbul 6221', () => {
    const rows = compareRiwayat(1)
    const byRiwaya = Object.fromEntries(rows.map(r => [r.riwaya, r.totalAyahs]))
    expect(byRiwaya).toEqual({ hafs: 6236, shuba: 6236, warsh: 6214, qalun: 6214, douri: 6217, sousi: 6217, bazzi: 6221, qunbul: 6221 })
  })

  it('surah 2 differs between hafs (286) and warsh (285)', () => {
    const rows = compareRiwayat(2)
    expect(rows.find(r => r.riwaya === 'hafs')!.surahAyahCount).toBe(286)
    expect(rows.find(r => r.riwaya === 'warsh')!.surahAyahCount).toBe(285)
  })

  it('positions 2:255 per riwaya (page 42 in both hafs and warsh)', () => {
    const rows = compareRiwayat(2, 255)
    expect(rows.find(r => r.riwaya === 'hafs')!.ayah?.page).toBe(42)
    expect(rows.find(r => r.riwaya === 'warsh')!.ayah?.page).toBe(42)
  })

  it('omits ayah detail for riwayat whose surah count is below the requested ayah', () => {
    const rows = compareRiwayat(2, 286)
    expect(rows.find(r => r.riwaya === 'hafs')!.ayah).toBeDefined()
    expect(rows.find(r => r.riwaya === 'warsh')!.ayah).toBeUndefined()
  })
})

describe('quran_convert_ayah', () => {
  it('Hafs 2:255 = Warsh 2:253 (documented boundary shift)', () => {
    expect(convertAyahBetween(2, 255, 'Hafs', 'Warsh')).toEqual({ surah: 2, ayah: 253 })
  })

  it('identity conversion within one riwaya', () => {
    expect(convertAyahBetween(1, 1, 'Hafs', 'Hafs')).toEqual({ surah: 1, ayah: 1 })
  })

  it('round-trips Hafs→Warsh→Hafs', () => {
    const warsh = convertAyahBetween(2, 255, 'Hafs', 'Warsh')
    expect(convertAyahBetween(warsh.surah, warsh.ayah, 'Warsh', 'Hafs')).toEqual({ surah: 2, ayah: 255 })
  })
})
