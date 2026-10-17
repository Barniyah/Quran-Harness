/**
 * Pinned Tanzil Uthmani Quran text artifact: the single data owner for Quran
 * text capabilities. Loading always verifies the artifact's SHA-256 against
 * the pinned sidecar before serving a single verse — a tampered or corrupted
 * artifact fails loud, never silently.
 *
 * @module @deepseek-ai/dsh-quran-data
 */

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { SourceDescriptor } from '@deepseek-ai/dsh-quran-evidence'

/** The Tanzil source descriptor shared by every consumer of this artifact. */
export const TANZIL_UTHMANI: SourceDescriptor = {
  id: 'tanzil-uthmani',
  name: 'Tanzil — Uthmani text',
  url: 'https://tanzil.net/download',
  trust: 'L1-official',
  version: 'pinned-2026-10-16',
}

const DATA_FILE = join(dirname(fileURLToPath(import.meta.url)), '../data/quran-uthmani.txt')
const HASH_FILE = join(dirname(fileURLToPath(import.meta.url)), '../data/quran-uthmani.sha256')
const IMLAEI_FILE = join(dirname(fileURLToPath(import.meta.url)), '../data/quran-simple-clean.txt')
const IMLAEI_HASH_FILE = join(dirname(fileURLToPath(import.meta.url)), '../data/quran-simple-clean.sha256')

/** The Tanzil Imla'ei (standard-spelling) artifact used as the search corpus. */
export const TANZIL_IMLAEI: SourceDescriptor = {
  id: 'tanzil-imlaei',
  name: 'Tanzil — Imla’ei (simple-clean) text',
  url: 'https://tanzil.net/download',
  trust: 'L1-official',
  version: 'pinned-2026-10-17',
}

/** One verse row from the artifact. */
export interface VerseRow {
  /** 1-114 */
  readonly surah: number
  /** Ayah number within the surah. */
  readonly ayah: number
  /** Verse key, e.g. `2:255`. */
  readonly key: string
  /** Uthmani text exactly as in the artifact. */
  readonly text: string
}

let cache: readonly VerseRow[] | undefined
let cacheByKey: Map<string, VerseRow> | undefined
let imlaeiCache: readonly VerseRow[] | undefined

/** Parse a Tanzil `surah|ayah|text` file whose integrity hash was verified by the caller. */
function parseRows(text: string): VerseRow[] {
  const rows: VerseRow[] = []
  for (const line of text.split('\n')) {
    if (!line) continue
    const sep1 = line.indexOf('|')
    const sep2 = line.indexOf('|', sep1 + 1)
    const surah = Number(line.slice(0, sep1))
    const ayah = Number(line.slice(sep1 + 1, sep2))
    rows.push({ surah, ayah, key: `${surah}:${ayah}`, text: line.slice(sep2 + 1).replace(/\r$/, '') })
  }
  if (rows.length !== 6236) {
    throw new Error(`Tanzil artifact must hold exactly 6236 verses, got ${rows.length}`)
  }
  return rows
}

async function loadVerified(file: string, hashFile: string): Promise<string> {
  const [text, hashLine] = await Promise.all([readFile(file, 'utf8'), readFile(hashFile, 'utf8')])
  const expected = hashLine.trim().split(/\s+/)[0]
  const actual = createHash('sha256').update(text, 'utf8').digest('hex')
  if (actual !== expected) {
    throw new Error(`Tanzil artifact integrity check FAILED for ${file}: expected ${expected}, got ${actual} — do not serve any verse`)
  }
  return text
}

/**
 * Load the pinned artifact, verifying its integrity hash first.
 * @returns all 6236 verse rows in mushaf order.
 * @throws when the artifact's SHA-256 differs from the pinned sidecar.
 */
export async function loadUthmaniVerses(): Promise<readonly VerseRow[]> {
  if (cache) return cache
  cache = parseRows(await loadVerified(DATA_FILE, HASH_FILE))
  cacheByKey = new Map(cache.map(r => [r.key, r]))
  return cache
}

/**
 * Load the pinned Imla'ei (standard-spelling) artifact — the skeleton-search
 * corpus, because Uthmani orthography omits written alefs that modern typing
 * includes (e.g. العالمين). Same integrity discipline as the Uthmani artifact.
 * @returns all 6236 verse rows in mushaf order, aligned by key with the Uthmani rows.
 */
export async function loadImlaeiVerses(): Promise<readonly VerseRow[]> {
  if (imlaeiCache) return imlaeiCache
  imlaeiCache = parseRows(await loadVerified(IMLAEI_FILE, IMLAEI_HASH_FILE))
  return imlaeiCache
}

/** Look up one verse row by `surah:ayah` key; undefined when absent. */
export async function getVerse(surah: number, ayah: number): Promise<VerseRow | undefined> {
  await loadUthmaniVerses()
  return cacheByKey?.get(`${surah}:${ayah}`)
}

/** Arabic combining marks (harakat, pause marks) stripped for skeleton search. */
const MARKS_RUN = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g

/**
 * Search skeleton: strip harakat/pause marks/tatweel, unify alef forms
 * (ٱ أ إ آ → ا) and alef-maqsura/ya (ى → ي). Documented and deterministic —
 * the same transform applies to the query and the corpus, so matching is
 * symmetric and reviewable.
 */
export function toSearchSkeleton(text: string): string {
  return text
    .normalize('NFC')
    .replace(MARKS_RUN, '')
    .replace(/ـ/g, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
}
