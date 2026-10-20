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
const TIMING_FILE = join(dirname(fileURLToPath(import.meta.url)), '../data/timing-husary.json')
const MORPHOLOGY_FILE = join(dirname(fileURLToPath(import.meta.url)), '../data/quran-morphology.txt')
const MORPHOLOGY_HASH_FILE = join(dirname(fileURLToPath(import.meta.url)), '../data/quran-morphology.sha256')
const TOPICS_FILE = join(dirname(fileURLToPath(import.meta.url)), '../data/quranpedia-topics.json')
const TOPICS_HASH_FILE = join(dirname(fileURLToPath(import.meta.url)), '../data/quranpedia-topics.sha256')

/** The Quranpedia topics catalog descriptor. */
export const QURANPEDIA_TOPICS: SourceDescriptor = {
  id: 'quranpedia-topics',
  name: 'Quranpedia — thematic classification of verses',
  url: 'https://api.quranpedia.net/v1/topics',
  trust: 'L2-verified-open',
  version: 'pinned-2026-10-18',
}

/** The Quranic Arabic Corpus morphology descriptor (revised fork, Arabic script). */
export const QAC_MORPHOLOGY: SourceDescriptor = {
  id: 'qac-morphology-revised',
  name: 'Quranic Arabic Corpus v0.4 — revised morphology (mustafa0x fork, Arabic script)',
  url: 'https://github.com/mustafa0x/quran-morphology',
  trust: 'L2-verified-open',
  version: 'pinned-2026-10-18',
}
const TIMING_HASH_FILE = join(dirname(fileURLToPath(import.meta.url)), '../data/timing-husary.sha256')

/** The EveryAyah Husary timing set descriptor. */
export const EVERYAYAH_TIMING_HUSARY: SourceDescriptor = {
  id: 'everyayah-timing-husary',
  name: 'EveryAyah timings — Mahmoud Khalil Al-Husary (Murattal)',
  url: 'https://everyayah.com/data/timings_files/Husary_Timings.zip',
  trust: 'L3-community',
  version: 'pinned-2026-10-18',
}

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
let timingCache: HusaryTiming | undefined
let morphologyCache: MorphSegment[] | undefined
let topicsCache: readonly QuranTopic[] | undefined

/** One topic in the Quranpedia thematic catalog. */
export interface QuranTopic {
  readonly id: number
  readonly name: string
  readonly parent_id: number | null
  /** Comma-separated verse references, e.g. "7:26" or "2:30,2:31". */
  readonly ayahs: string
}

/** Load the pinned topics catalog (integrity-checked). */
export async function loadTopics(): Promise<readonly QuranTopic[]> {
  if (topicsCache) return topicsCache
  const text = await loadVerified(TOPICS_FILE, TOPICS_HASH_FILE)
  const parsed = JSON.parse(text) as QuranTopic[]
  if (!Array.isArray(parsed) || parsed.length < 6000) {
    throw new Error(`topics artifact must hold 6000+ topics, got ${Array.isArray(parsed) ? parsed.length : 'not-an-array'}`)
  }
  topicsCache = parsed
  return parsed
}

/** Search topics by name (skeleton match); returns topics that carry verse references first. */
export function searchTopics(topics: readonly QuranTopic[], query: string, limit = 20): QuranTopic[] {
  const needle = toSearchSkeleton(query)
  if (!needle) return []
  const matched = topics.filter(t => toSearchSkeleton(t.name).includes(needle))
  matched.sort((a, b) => Number(Boolean(b.ayahs)) - Number(Boolean(a.ayahs)))
  return matched.slice(0, limit)
}

/** One morphological segment row (QAC revised format). */
export interface MorphSegment {
  readonly surah: number
  readonly ayah: number
  readonly word: number
  readonly segment: number
  /** Surface form in Arabic script. */
  readonly text: string
  /** Coarse part-of-speech tag (N, V, P, PN, ...). */
  readonly tag: string
  /** Fine features: ROOT, LEM, PRF, CASE, etc. as `KEY:value` pairs plus bare flags. */
  readonly features: Record<string, string>
  /** Bare feature flags without a value (e.g. PREF, GEN, M). */
  readonly flags: readonly string[]
}

/** Load the pinned morphology artifact (integrity-checked). */
export async function loadMorphology(): Promise<readonly MorphSegment[]> {
  if (morphologyCache) return morphologyCache
  const text = await loadVerified(MORPHOLOGY_FILE, MORPHOLOGY_HASH_FILE)
  const rows: MorphSegment[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.replace(/\r$/, '')
    if (!trimmed) continue
    // Columns: location (s:a:w:seg) <TAB> surface <TAB> coarse-tag <TAB> features
    const cols = trimmed.split('\t')
    if (cols.length < 4) continue
    const loc = (cols[0] ?? '').split(':').map(Number)
    const features: Record<string, string> = {}
    const flags: string[] = []
    for (const kv of (cols[3] ?? '').split('|')) {
      const eq = kv.indexOf(':')
      if (eq > 0) features[kv.slice(0, eq)] = kv.slice(eq + 1)
      else if (kv) flags.push(kv)
    }
    rows.push({
      surah: loc[0] ?? 0, ayah: loc[1] ?? 0, word: loc[2] ?? 0, segment: loc[3] ?? 0,
      text: cols[1] ?? '', tag: cols[2] ?? '', features, flags,
    })
  }
  morphologyCache = rows
  return rows
}

/** All segments of one ayah, in word order. */
export async function getAyahMorphology(surah: number, ayah: number): Promise<MorphSegment[]> {
  const rows = await loadMorphology()
  return rows.filter(r => r.surah === surah && r.ayah === ayah)
}

/** One surah's timing block in the pinned Husary set. */
export interface SurahTiming {
  /** Whether the source file carried a leading basmalah/isti'adha segment (dropped from ayahEndMs, documented). */
  readonly introSegment: boolean
  /** ayahEndMs[i] = end of ayah i+1 in milliseconds; start = previous end or 0. */
  readonly ayahEndMs: readonly number[]
}

/** The pinned Husary timing document. */
export interface HusaryTiming {
  readonly reciter: string
  readonly reciterName: string
  readonly source: string
  readonly unit: 'ms'
  readonly convention: string
  readonly surahs: Record<string, SurahTiming>
}

/** One ayah's timing span in milliseconds. */
export interface AyahTimingSpan {
  readonly startMs: number
  readonly endMs: number
  readonly durationMs: number
}

/**
 * Load the pinned Husary timing set with the same integrity discipline as the
 * text artifacts.
 */
export async function loadHusaryTiming(): Promise<HusaryTiming> {
  if (timingCache) return timingCache
  const text = await loadVerified(TIMING_FILE, TIMING_HASH_FILE)
  const parsed = JSON.parse(text) as HusaryTiming
  if (Object.keys(parsed.surahs).length !== 114) {
    throw new Error(`timing artifact must hold 114 surahs, got ${Object.keys(parsed.surahs).length}`)
  }
  timingCache = parsed
  return parsed
}

/** Start/end/duration of one ayah in the Husary set; undefined when absent. */
export function ayahTiming(timing: HusaryTiming, surah: number, ayah: number): AyahTimingSpan | undefined {
  const block = timing.surahs[String(surah)]
  const endMs = block?.ayahEndMs[ayah - 1]
  const prevEndMs = ayah > 1 ? block?.ayahEndMs[ayah - 2] : 0
  if (block === undefined || endMs === undefined || prevEndMs === undefined) return undefined
  return { startMs: prevEndMs, endMs, durationMs: endMs - prevEndMs }
}

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
