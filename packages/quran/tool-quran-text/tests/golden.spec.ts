/**
 * Golden test for the Quran Harness evidence pipeline.
 *
 * Proves end-to-end that:
 *  1. The pinned Tanzil Uthmani artifact passes its SHA-256 integrity check.
 *  2. Representative verses cross-verify between Tanzil (L1) and the
 *     independent Quran.com API / Quran Foundation (L2) after the declared normalization.
 *  3. A tampered payload is detected as MISMATCH (negative control).
 *  4. Envelopes carry the mandatory governance fields.
 */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createEnvelope, crossVerify, sha256 } from '@deepseek-ai/dsh-quran-evidence'
import type { SourceDescriptor, TransformRecord } from '@deepseek-ai/dsh-quran-evidence'

const TANZIL: SourceDescriptor = {
  id: 'tanzil-uthmani',
  name: 'Tanzil — Uthmani text',
  url: 'https://tanzil.net/download',
  trust: 'L1-official',
  version: 'pinned-2026-10-16',
}

const QURAN_COM: SourceDescriptor = {
  id: 'quran-com-v4-uthmani',
  name: 'Quran.com API v4 (Quran Foundation) — text_uthmani',
  url: 'https://api.quran.com/api/v4',
  trust: 'L2-verified-open',
}

const NORMALIZATION: TransformRecord = {
  id: 'quran-compare-normalize',
  detail: 'Unicode NFC + strip tatweel U+0640 and rub-el-hizb marker U+06DE + collapse whitespace + trim; for first verses (ayah 1, surah != 1) strip the leading Basmalah that Tanzil includes but Quran.com excludes; both sides transformed identically',
}

const MARKS_RUN = /[ؐ-ًؚ-ٰٟۖ-ۭ]+/g
const BASMALAH_SKELETON = ['بسم', 'الله', 'الرحمن', 'الرحيم']

const stripLeadingBasmalahWords = (n: string) => {
  const skeleton = (w: string) => w.replace(MARKS_RUN, '').replace(/[ٱأإآ]/g, 'ا')
  const words = n.split(' ')
  if (words.length > 4 && BASMALAH_SKELETON.every((w, i) => skeleton(words[i] ?? '') === w)) return words.slice(4).join(' ')
  return n
}

const normalize = (t: string, stripBasmalah = false) => {
  let n = t.normalize('NFC').replace(/[ـ۞۩]/g, '').replace(/\s+/g, ' ').trim()
  n = n.replace(MARKS_RUN, run => [...run].sort().join(''))
  if (stripBasmalah) n = stripLeadingBasmalahWords(n)
  return n
}

async function loadTanzilMap() {
  const dir = join(__dirname, '../../quran-data/data')
  const [text, hashLine] = await Promise.all([
    readFile(join(dir, 'quran-uthmani.txt'), 'utf8'),
    readFile(join(dir, 'quran-uthmani.sha256'), 'utf8'),
  ])
  const expected = hashLine.trim().split(/\s+/)[0]
  const actual = createHash('sha256').update(text, 'utf8').digest('hex')
  const map = new Map<string, string>()
  for (const line of text.split('\n')) {
    if (!line) continue
    const s1 = line.indexOf('|')
    const s2 = line.indexOf('|', s1 + 1)
    map.set(`${line.slice(0, s1)}:${line.slice(s1 + 1, s2)}`, line.slice(s2 + 1).replace(/\r$/, ''))
  }
  return { map, integrity: { expected, actual, ok: expected === actual } }
}

async function fetchCloud(surah: number, ayah: number): Promise<string> {
  const res = await fetch(`${QURAN_COM.url}/quran/verses/uthmani?verse_key=${surah}:${ayah}`)
  const body = await res.json() as { verses?: { text_uthmani?: string }[] }
  const text = body.verses?.[0]?.text_uthmani
  if (typeof text !== 'string') throw new Error(`cloud fetch failed for ${surah}:${ayah}`)
  return text
}

/** Representative verses spanning the mushaf: opening, middle, longest surah, closing. */
const GOLDEN_VERSES: [number, number][] = [[1, 1], [2, 255], [18, 1], [55, 13], [112, 1], [114, 6]]

describe('golden: evidence pipeline', () => {
  it('pinned Tanzil artifact passes SHA-256 integrity check and holds 6236 verses', async () => {
    const { map, integrity } = await loadTanzilMap()
    expect(integrity.ok, `integrity mismatch: ${integrity.actual} != ${integrity.expected}`).toBe(true)
    expect(map.size).toBe(6236)
  })

  it('representative verses cross-verify between Tanzil and Quran.com', async () => {
    const { map } = await loadTanzilMap()
    for (const [surah, ayah] of GOLDEN_VERSES) {
      const local = map.get(`${surah}:${ayah}`)
      expect(local, `verse ${surah}:${ayah} missing from Tanzil artifact`).toBeDefined()
      const remote = await fetchCloud(surah, ayah)
      const strip = ayah === 1 && surah !== 1
      const verification = crossVerify(
        createEnvelope(normalize(local!, strip), TANZIL, [NORMALIZATION]),
        createEnvelope(normalize(remote, strip), QURAN_COM, [NORMALIZATION]),
        NORMALIZATION,
      )
      expect(verification.match, `${surah}:${ayah} — ${verification.verdict}`).toBe(true)
    }
  }, 60000)

  it('tampered payload is detected as MISMATCH (negative control)', () => {
    const genuine = createEnvelope(normalize('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'), TANZIL, [NORMALIZATION])
    const tampered = createEnvelope(normalize('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ٠'), QURAN_COM, [NORMALIZATION])
    const verification = crossVerify(genuine, tampered, NORMALIZATION)
    expect(verification.match).toBe(false)
    expect(verification.verdict).toContain('MISMATCH')
  })

  it('envelope carries all mandatory governance fields', () => {
    const env = createEnvelope('test', TANZIL)
    expect(env.kind).toBe('evidence-envelope/v1')
    expect(env.contentHash).toMatch(/^[0-9a-f]{64}$/)
    expect(env.contentHash).toBe(sha256('test'))
    expect(env.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(env.source.trust).toBe('L1-official')
    expect(env.transforms).toEqual([])
  })
})
