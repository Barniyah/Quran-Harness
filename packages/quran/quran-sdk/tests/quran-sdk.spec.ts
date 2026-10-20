import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  createQuranSdk,
  fetchQuranComVerse,
  normalizeForCrossVerify,
  verifyEnvelopeIntegrity,
} from '../src/index.ts'
import type { EvidenceEnvelope } from '../src/index.ts'

describe('@deepseek-ai/dsh-quran-sdk', () => {
  it('cross-verifies a verse when sources match and withholds text on mismatch', async (test) => {
    const dir = await mkdtemp(join(tmpdir(), 'quran-sdk-'))
    test.onTestFinished(() => rm(dir, { recursive: true, force: true }))
    const auditLogPath = join(dir, 'audit.jsonl')

    // Surah 112 Ayah 1 in Tanzil has leading Basmalah; Quran.com omits Basmalah on 112:1
    const matchingSdk = createQuranSdk({
      auditLogPath,
      crossSourceFetcher: async () => ({
        text: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
      }),
    })

    const ok = await matchingSdk.getVerse(112, 1)
    expect(ok.status).toBe('ok')
    expect(ok.reference).toBe('112:1')
    expect(ok.text).toContain('قُلْ هُوَ ٱللَّهُ أَحَدٌ')
    expect(ok.verification.match).toBe(true)
    expect(matchingSdk.verifyEnvelope(ok.evidence).valid).toBe(true)

    const mismatchSdk = createQuranSdk({
      auditLogPath,
      crossSourceFetcher: async () => ({
        text: 'نص مختلف تماما',
        source: {
          id: 'mock-secondary',
          name: 'Mock Secondary',
          url: 'https://example.test',
          trust: 'L2-verified-open',
        },
      }),
    })

    const bad = await mismatchSdk.getVerse(1, 1)
    expect(bad.status).toBe('mismatch')
    expect(bad.text).toBeUndefined()
    expect(bad.verification.match).toBe(false)

    // Verify audit log entries were written
    const logLines = (await readFile(auditLogPath, 'utf8')).trim().split('\n')
    expect(logLines.length).toBe(2)

    await expect(matchingSdk.getVerse(0, 1)).rejects.toThrow('surah must be an integer in 1..114')
    await expect(matchingSdk.getVerse(1, 0)).rejects.toThrow('ayah must be a positive integer')
    await expect(matchingSdk.getVerse(112, 5)).rejects.toThrow('verse 112:5 not found')
  })

  it('normalizes Basmalah only when 4 Basmalah words precede the verse', () => {
    expect(normalizeForCrossVerify('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ ۞ قُلْ هُوَ ٱللَّهُ أَحَدٌ', true))
      .toBe(normalizeForCrossVerify('قُلْ هُوَ ٱللَّهُ أَحَدٌ', false))
    // Surah 1:1 is only 4 words, so stripBasmalah=false keeps it intact, and even stripBasmalah=true on <=4 words keeps it
    expect(normalizeForCrossVerify('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', true)).toContain('بِسْمِ')
    expect(normalizeForCrossVerify('كلمات عادية اخرى هنا خمسة', true)).toBe('كلمات عادية اخرى هنا خمسة')
  })

  it('handles fetchQuranComVerse success and error branches', async () => {
    const origFetch = globalThis.fetch
    try {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ verses: [{ text_uthmani: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ' }] }),
      }) as unknown as typeof fetch
      const controller = new AbortController()
      const res = await fetchQuranComVerse(1, 2, controller.signal)
      expect(res.text).toContain('ٱلْحَمْدُ')
      expect(res.source.id).toBe('quran-com-v4-uthmani')

      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 503,
      }) as unknown as typeof fetch
      await expect(fetchQuranComVerse(1, 2)).rejects.toThrow('Quran.com API responded 503')

      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ verses: [] }),
      }) as unknown as typeof fetch
      await expect(fetchQuranComVerse(1, 2)).rejects.toThrow('Quran.com API returned no verse text for 1:2')
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it('serves metadata, search, riwayat, layout, timing, morphology, and topics with valid envelopes', async () => {
    const sdk = createQuranSdk()

    // Metadata
    const surahMeta = await sdk.getMetadata(112)
    expect(surahMeta.metadata.ayahCount).toBe(4)
    expect(surahMeta.metadata.ayah).toBeUndefined()
    expect(sdk.verifyEnvelope(surahMeta.evidence).valid).toBe(true)

    const ayahMeta = await sdk.getMetadata(2, 255)
    expect(ayahMeta.metadata.ayah?.page).toBe(42)
    expect(ayahMeta.metadata.ayah?.juz).toBe(3)
    await expect(sdk.getMetadata(115)).rejects.toThrow('surah must be an integer')
    await expect(sdk.getMetadata(112, 5)).rejects.toThrow('ayah must be an integer in 1..4')

    // Search (skeleton & exact)
    const skelSearch = await sdk.search('العالمين', { surah: 1, limit: 5 })
    expect(skelSearch.result.totalMatches).toBe(1)
    expect(skelSearch.result.hits[0]?.key).toBe('1:2')
    expect(sdk.verifyEnvelope(skelSearch.evidence).valid).toBe(true)

    const exactSearch = await sdk.search('ٱللَّهُ أَحَدٌ', { mode: 'exact' })
    expect(exactSearch.result.totalMatches).toBeGreaterThanOrEqual(1)
    expect(exactSearch.evidence.transforms.length).toBe(0)

    await expect(sdk.search('   ')).rejects.toThrow('query must be a non-empty string')
    await expect(sdk.search('الحمد', { surah: 999 })).rejects.toThrow('surah must be an integer in 1..114')
    await expect(sdk.search('ـــ')).rejects.toThrow('query has no searchable letters')

    // Riwayat comparison & conversion
    const riwayat = await sdk.compareRiwayat(2, 255)
    expect(riwayat.rows.length).toBe(8)
    expect(riwayat.differFromHafs).toContain('warsh')
    expect(sdk.verifyEnvelope(riwayat.evidence).valid).toBe(true)
    await expect(sdk.compareRiwayat(0)).rejects.toThrow('surah must be an integer in 1..114')

    const converted = await sdk.convertAyah(2, 255, 'Hafs', 'Warsh')
    expect(converted.to.reference).toBe('2:253')
    expect(sdk.verifyEnvelope(converted.evidence).valid).toBe(true)
    await expect(sdk.convertAyah(0, 1, 'Hafs', 'Warsh')).rejects.toThrow('surah must be an integer in 1..114')
    await expect(sdk.convertAyah(2, 0, 'Hafs', 'Warsh')).rejects.toThrow('ayah must be a positive integer')

    // Page layout
    const layout = await sdk.getPageLayout(604)
    expect(layout.spans.map(s => s.surah)).toEqual([112, 113, 114])
    expect(sdk.verifyEnvelope(layout.evidence).valid).toBe(true)
    await expect(sdk.getPageLayout(605)).rejects.toThrow('page must be an integer in 1..604')

    // Timing
    const timing = await sdk.getAyahTiming(1, 2)
    expect(timing.timing.durationMs).toBeGreaterThan(0)
    expect(timing.audioUrl).toContain('001002.mp3')
    expect(sdk.verifyEnvelope(timing.evidence).valid).toBe(true)
    await expect(sdk.getAyahTiming(112, 9)).rejects.toThrow('verse 112:9 not found')

    // Morphology
    const morph = await sdk.getAyahMorphology(112, 1)
    expect(morph.words.length).toBe(4)
    expect(sdk.verifyEnvelope(morph.evidence).valid).toBe(true)
    await expect(sdk.getAyahMorphology(112, 9)).rejects.toThrow('verse 112:9 not found')

    // Topics
    const topics = await sdk.searchTopics('الصلاة', 5)
    expect(topics.topics.length).toBe(5)
    expect(sdk.verifyEnvelope(topics.evidence).valid).toBe(true)
    await expect(sdk.searchTopics('')).rejects.toThrow('query must be a non-empty string')
  })

  it('detects tampered envelopes and insufficient trust levels in verifyEnvelopeIntegrity', () => {
    const validEnv: EvidenceEnvelope<{ ayah: string }> = {
      kind: 'evidence-envelope/v1',
      source: {
        id: 'test-src',
        name: 'Test Source',
        url: 'https://example.test',
        trust: 'L3-community',
      },
      contentHash: '9fa14b211a9a985dc44bf42a08ac7aa10a496f6277a01ef4b7aa5fb58d7225f8',
      retrievedAt: '2026-10-21T00:00:00.000Z',
      transforms: [],
      payload: { ayah: 'test' },
    }
    const tampered: EvidenceEnvelope<{ ayah: string }> = {
      ...validEnv,
      payload: { ayah: 'tampered!' },
    }
    const hashFail = verifyEnvelopeIntegrity(tampered)
    expect(hashFail.valid).toBe(false)
    expect(hashFail.hashMatches).toBe(false)
    expect(hashFail.reason).toContain('SHA-256 digest mismatch')

    const cleanEnv: EvidenceEnvelope<string> = {
      ...validEnv,
      payload: 'hello',
      contentHash: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    }
    const trustFail = verifyEnvelopeIntegrity(cleanEnv, 'L1-official')
    expect(trustFail.valid).toBe(false)
    expect(trustFail.hashMatches).toBe(true)
    expect(trustFail.trustSatisfied).toBe(false)
    expect(trustFail.reason).toContain('does not meet minimum required L1-official')
  })
})
