/**
 * TypeScript developer SDK for building evidence-governed Quranic applications
 * and reproducible research pipelines on top of the Quran Harness primitives.
 *
 * Every function returns an {@link EvidenceEnvelope} (and {@link CrossVerification}
 * for primary Quranic text) so downstream applications can render a Governance
 * Card, verify SHA-256 content digests, and append to an immutable audit log.
 *
 * @module @deepseek-ai/dsh-quran-sdk
 */

import {
  appendAuditLog,
  canonicalize,
  createEnvelope,
  crossVerify,
  sha256,
  trustAtLeast,
} from '@deepseek-ai/dsh-quran-evidence'
import type {
  CrossVerification,
  EvidenceEnvelope,
  SourceDescriptor,
  TransformRecord,
  TrustLevel,
} from '@deepseek-ai/dsh-quran-evidence'
import {
  ayahTiming,
  EVERYAYAH_TIMING_HUSARY,
  getAyahMorphology as loadAyahSegments,
  getVerse as getTanzilVerse,
  loadHusaryTiming,
  loadImlaeiVerses,
  loadTopics,
  loadUthmaniVerses,
  QAC_MORPHOLOGY,
  QURANPEDIA_TOPICS,
  searchTopics as filterTopics,
  TANZIL_IMLAEI,
  TANZIL_UTHMANI,
  toSearchSkeleton,
} from '@deepseek-ai/dsh-quran-data'
import type { AyahTimingSpan, QuranTopic } from '@deepseek-ai/dsh-quran-data'
import { getPageComposition, PAGE_COUNT } from '@deepseek-ai/dsh-tool-mushaf-layout'
import type { PageSpan } from '@deepseek-ai/dsh-tool-mushaf-layout'
import { everyAyahUrl } from '@deepseek-ai/dsh-tool-quran-audio'
import { groupByWord } from '@deepseek-ai/dsh-tool-quran-linguistics'
import type { WordMorphology } from '@deepseek-ai/dsh-tool-quran-linguistics'
import type { QuranMetadata } from '@deepseek-ai/dsh-tool-quran-metadata'
import { compareRiwayat as computeRiwayatTable, convertAyahBetween } from '@deepseek-ai/dsh-tool-quran-riwayat'
import type { RiwayaRow } from '@deepseek-ai/dsh-tool-quran-riwayat'
import { searchVerses } from '@deepseek-ai/dsh-tool-quran-search'
import type { QuranSearchResult, SearchHit } from '@deepseek-ai/dsh-tool-quran-search'
import type { QuranVerseResult } from '@deepseek-ai/dsh-tool-quran-text'
import { createHafs, getSurahName, meta, surahNamesAr } from 'quran-meta'
import type { AyahNo, Surah } from 'quran-meta'

export {
  appendAuditLog,
  canonicalize,
  createEnvelope,
  crossVerify,
  everyAyahUrl,
  PAGE_COUNT,
  sha256,
  toSearchSkeleton,
  trustAtLeast,
}
export type {
  AyahTimingSpan,
  CrossVerification,
  EvidenceEnvelope,
  PageSpan,
  QuranMetadata,
  QuranSearchResult,
  QuranTopic,
  QuranVerseResult,
  RiwayaRow,
  SearchHit,
  SourceDescriptor,
  TransformRecord,
  TrustLevel,
  WordMorphology,
}

/** Supported canonical riwaya names for coordinate conversion. */
export type RiwayaName = 'Hafs' | 'Warsh' | 'Qalun' | 'Shuba' | 'Douri' | 'Sousi' | 'Bazzi' | 'Qunbul'

const QURAN_COM_UTHMANI: SourceDescriptor = {
  id: 'quran-com-v4-uthmani',
  name: 'Quran.com API v4 (Quran Foundation) — text_uthmani',
  url: 'https://api.quran.com/api/v4',
  trust: 'L2-verified-open',
}

const QURAN_META_HAFS: SourceDescriptor = {
  id: 'quran-meta-hafs',
  name: 'quran-meta library (quran-center) — Hafs riwaya',
  url: 'https://github.com/quran-center/quran-meta',
  trust: 'L2-verified-open',
  version: '7.0.0',
}

const QURAN_META_RIWAYAT: SourceDescriptor = {
  id: 'quran-meta-riwayat',
  name: 'quran-meta library (quran-center) — 8 riwayat datasets',
  url: 'https://github.com/quran-center/quran-meta',
  trust: 'L2-verified-open',
  version: '7.0.0',
}

const QURAN_META_PAGES: SourceDescriptor = {
  id: 'quran-meta-pages',
  name: 'quran-meta library (quran-center) — Hafs page map',
  url: 'https://github.com/quran-center/quran-meta',
  trust: 'L2-verified-open',
  version: '7.0.0',
}

const COMPARE_NORMALIZATION: TransformRecord = {
  id: 'quran-compare-normalize',
  detail: 'Unicode NFC + strip tatweel U+0640 and rub-el-hizb/sajdah markers + canonicalize combining-mark order + strip leading Basmalah on first verses outside Surah 1',
}

const SKELETON_TRANSFORM: TransformRecord = {
  id: 'quran-search-skeleton',
  detail: 'Query skeletonized (NFC, strip harakat/marks/tatweel, unify alef forms, ى → ي) and matched against the pinned Tanzil Imla’ei corpus; returned text is untouched Uthmani.',
}

const TIMING_CONVENTION: TransformRecord = {
  id: 'everyayah-timing-convention',
  detail: 'ayahEndMs[i] = cumulative end of ayah i+1 (ms from surah audio start); leading intro segment dropped in 113 surahs.',
}

const MARKS_RUN = /[ؐ-ًؚ-ٰٟۖ-ۭ]+/g
const BASMALAH_SKELETON = ['بسم', 'الله', 'الرحمن', 'الرحيم']

function stripLeadingBasmalahWords(n: string): string {
  const skeleton = (w: string) => w.replace(MARKS_RUN, '').replace(/[ٱأإآ]/g, 'ا')
  const words = n.split(' ')
  if (words.length > 4 && BASMALAH_SKELETON.every((w, i) => skeleton(words[i] ?? '') === w)) {
    return words.slice(4).join(' ')
  }
  return n
}

/**
 * Normalize Uthmani verse text from two independent sources so orthographic
 * encoding differences (combining-mark order, tatweel padding, rub-el-hizb
 * markers, or Tanzil's leading Basmalah on ayah 1 outside Surah 1) do not
 * mask genuine textual agreement or disagreement.
 */
export function normalizeForCrossVerify(text: string, stripBasmalah: boolean): string {
  let n = text.normalize('NFC').replace(/[ـ۞۩]/g, '').replace(/\s+/g, ' ').trim()
  n = n.replace(MARKS_RUN, run => [...run].sort().join(''))
  if (stripBasmalah) n = stripLeadingBasmalahWords(n)
  return n
}

/** Custom secondary-source fetcher for verse cross-verification. */
export type CrossSourceFetcher = (surah: number, ayah: number, signal?: AbortSignal) => Promise<{
  readonly text: string
  readonly source?: SourceDescriptor
}>

/** Default secondary-source fetcher against Quran.com API v4. */
export async function fetchQuranComVerse(surah: number, ayah: number, signal?: AbortSignal): Promise<{
  readonly text: string
  readonly source: SourceDescriptor
}> {
  const res = await fetch(`${QURAN_COM_UTHMANI.url}/quran/verses/uthmani?verse_key=${surah}:${ayah}`, {
    ...(signal ? { signal } : {}),
  })
  if (!res.ok) throw new Error(`Quran.com API responded ${res.status}`)
  const body = await res.json() as { verses?: { text_uthmani?: string }[] }
  const text = body.verses?.[0]?.text_uthmani
  if (typeof text !== 'string') throw new Error(`Quran.com API returned no verse text for ${surah}:${ayah}`)
  return { text, source: QURAN_COM_UTHMANI }
}

/** Configuration for {@link createQuranSdk} and individual SDK operations. */
export interface QuranSdkConfig {
  /** Optional append-only JSONL audit log path. When set, every SDK call appends an audit entry. */
  readonly auditLogPath?: string
  /** Optional custom secondary-source fetcher for {@link QuranSdk.getVerse}. Defaults to {@link fetchQuranComVerse}. */
  readonly crossSourceFetcher?: CrossSourceFetcher
  /** Minimum trust level required by {@link verifyEnvelopeIntegrity}. Defaults to `'L3-community'`. */
  readonly minTrustLevel?: TrustLevel
}

/** Result of cryptographic and policy verification of an {@link EvidenceEnvelope}. */
export interface EnvelopeIntegrityResult {
  readonly valid: boolean
  readonly hashMatches: boolean
  readonly trustSatisfied: boolean
  readonly expectedHash: string
  readonly actualHash: string
  readonly reason?: string
}

/**
 * Verify that an {@link EvidenceEnvelope} has not been tampered with since creation
 * and satisfies the minimum required {@link TrustLevel}.
 */
export function verifyEnvelopeIntegrity<T>(
  envelope: EvidenceEnvelope<T>,
  minTrust: TrustLevel = 'L3-community',
): EnvelopeIntegrityResult {
  const actualHash = sha256(canonicalize(envelope.payload))
  const hashMatches = actualHash === envelope.contentHash
  const trustSatisfied = trustAtLeast(envelope.source.trust, minTrust)
  const valid = hashMatches && trustSatisfied
  return {
    valid,
    hashMatches,
    trustSatisfied,
    expectedHash: envelope.contentHash,
    actualHash,
    ...(!hashMatches
      ? { reason: `SHA-256 digest mismatch: envelope claims ${envelope.contentHash.slice(0, 12)}…, computed ${actualHash.slice(0, 12)}…` }
      : !trustSatisfied
        ? { reason: `Source trust ${envelope.source.trust} does not meet minimum required ${minTrust}` }
        : {}),
  }
}

/** Options for {@link QuranSdk.search}. */
export interface SdkSearchOptions {
  readonly mode?: 'skeleton' | 'exact'
  readonly surah?: number
  readonly limit?: number
}

/** Developer-facing Quran SDK instance with bound governance configuration. */
export interface QuranSdk {
  /** Fetch a verse with mandatory two-source cross-verification. Withholds `text` on mismatch. */
  getVerse(surah: number, ayah: number, signal?: AbortSignal): Promise<QuranVerseResult>
  /** Get structural surah and optional ayah metadata (Hafs, offline). */
  getMetadata(surah: number, ayah?: number): Promise<{ readonly metadata: QuranMetadata; readonly evidence: EvidenceEnvelope<QuranMetadata> }>
  /** Search the Quran offline (skeleton or exact mode) and return untouched Uthmani hits. */
  search(query: string, options?: SdkSearchOptions): Promise<{ readonly result: QuranSearchResult; readonly evidence: EvidenceEnvelope<QuranSearchResult> }>
  /** Compare structural ayah counts and positioning across the 8 canonical riwayat. */
  compareRiwayat(surah: number, ayah?: number): Promise<{
    readonly surah: number
    readonly rows: readonly RiwayaRow[]
    readonly differFromHafs: readonly string[]
    readonly evidence: EvidenceEnvelope<{ surah: number; ayah: number | undefined; rows: readonly RiwayaRow[] }>
  }>
  /** Convert a verse coordinate between two riwayat numberings. */
  convertAyah(surah: number, ayah: number, from: RiwayaName, to: RiwayaName): Promise<{
    readonly from: { readonly riwaya: RiwayaName; readonly reference: string }
    readonly to: { readonly riwaya: RiwayaName; readonly reference: string; readonly surah: number; readonly ayah: number }
    readonly evidence: EvidenceEnvelope<{
      from: { riwaya: RiwayaName; reference: string }
      to: { riwaya: RiwayaName; reference: string; surah: number; ayah: number }
    }>
  }>
  /** Get the surah/ayah span composition of a printed Mushaf page (1..604). */
  getPageLayout(page: number): Promise<{
    readonly page: number
    readonly spans: readonly PageSpan[]
    readonly level: 'page-composition'
    readonly evidence: EvidenceEnvelope<{ page: number; spans: readonly PageSpan[]; level: 'page-composition' }>
  }>
  /** Get the pinned Husary Murattal timing (ms) and EveryAyah audio URL for one ayah. */
  getAyahTiming(surah: number, ayah: number): Promise<{
    readonly reference: string
    readonly timing: AyahTimingSpan & { readonly reference: string; readonly reciter: string }
    readonly audioUrl: string
    readonly evidence: EvidenceEnvelope<AyahTimingSpan & { readonly reference: string; readonly reciter: string }>
  }>
  /** Get word-by-word morphological breakdown from the pinned Quranic Arabic Corpus v0.4. */
  getAyahMorphology(surah: number, ayah: number): Promise<{
    readonly reference: string
    readonly words: readonly WordMorphology[]
    readonly evidence: EvidenceEnvelope<{ reference: string; words: readonly WordMorphology[] }>
  }>
  /** Search thematic topics in the pinned Quranpedia catalog (6,100 topics). */
  searchTopics(query: string, limit?: number): Promise<{
    readonly query: string
    readonly topics: readonly QuranTopic[]
    readonly evidence: EvidenceEnvelope<{ query: string; matched: readonly QuranTopic[] }>
  }>
  /** Verify the cryptographic digest and trust policy of any envelope. */
  verifyEnvelope<T>(envelope: EvidenceEnvelope<T>, minTrust?: TrustLevel): EnvelopeIntegrityResult
}

/**
 * Create a configured {@link QuranSdk} client for building Quranic applications
 * and research scripts with built-in evidence envelopes and optional audit logging.
 */
export function createQuranSdk(config: QuranSdkConfig = {}): QuranSdk {
  const { auditLogPath, crossSourceFetcher = fetchQuranComVerse, minTrustLevel = 'L3-community' } = config
  const hafs = createHafs()

  const recordAudit = async (
    operation: string,
    envelopes: readonly { source: string; contentHash: string }[],
    verification?: CrossVerification,
  ): Promise<void> => {
    if (!auditLogPath) return
    await appendAuditLog(auditLogPath, {
      at: new Date().toISOString(),
      operation,
      envelopes,
      ...(verification ? { verification } : {}),
    })
  }

  return {
    async getVerse(surah: number, ayah: number, signal?: AbortSignal): Promise<QuranVerseResult> {
      if (!Number.isInteger(surah) || surah < 1 || surah > 114) throw new Error('surah must be an integer in 1..114')
      if (!Number.isInteger(ayah) || ayah < 1) throw new Error('ayah must be a positive integer')

      const row = await getTanzilVerse(surah, ayah)
      if (row === undefined) throw new Error(`verse ${surah}:${ayah} not found in Tanzil artifact`)

      const stripBasmalah = ayah === 1 && surah !== 1
      const localNorm = createEnvelope(normalizeForCrossVerify(row.text, stripBasmalah), TANZIL_UTHMANI, [COMPARE_NORMALIZATION])
      const remote = await crossSourceFetcher(surah, ayah, signal)
      const remoteSource = remote.source ?? QURAN_COM_UTHMANI
      const remoteNorm = createEnvelope(normalizeForCrossVerify(remote.text, stripBasmalah), remoteSource, [COMPARE_NORMALIZATION])
      const verification = crossVerify(localNorm, remoteNorm, COMPARE_NORMALIZATION)
      const evidence = createEnvelope(row.text, TANZIL_UTHMANI)

      await recordAudit(
        'sdk.getVerse',
        [
          { source: localNorm.source.id, contentHash: localNorm.contentHash },
          { source: remoteNorm.source.id, contentHash: remoteNorm.contentHash },
        ],
        verification,
      )

      return {
        ...(verification.match ? { text: row.text } : {}),
        reference: row.key,
        evidence,
        verification,
        status: verification.match ? 'ok' : 'mismatch',
      }
    },

    async getMetadata(surah: number, ayah?: number) {
      if (!Number.isInteger(surah) || surah < 1 || surah > meta.numSurahs) {
        throw new Error(`surah must be an integer in 1..${meta.numSurahs}`)
      }
      const info = hafs.getSurahInfo(surah as Surah)
      const ayahCount = info[1] as number
      const nameArTashkeel = info[4] as string
      const isMakki = info[5] as boolean
      const [nameEn, meaningEn] = getSurahName(surah as Surah)
      const nameAr = (surahNamesAr[surah]?.[1] ?? nameArTashkeel) as string

      const metadata: QuranMetadata = {
        surah,
        nameAr,
        nameEn: nameEn as string,
        meaningEn: meaningEn as string,
        ayahCount,
        isMakki,
        ...(ayah !== undefined ? (() => {
          if (!Number.isInteger(ayah) || ayah < 1 || ayah > ayahCount) {
            throw new Error(`ayah must be an integer in 1..${ayahCount} for surah ${surah}`)
          }
          const globalAyahId = hafs.findAyahIdBySurah(surah as Surah, ayah as AyahNo)
          return {
            ayah: {
              ayah,
              globalAyahId,
              page: hafs.findPagebyAyahId(globalAyahId),
              juz: hafs.findJuzMetaBySurah(surah as Surah, ayah as AyahNo).leftJuz,
              rubAlHizb: hafs.findRubAlHizbByAyahId(globalAyahId),
            },
          }
        })() : {}),
      }

      const evidence = createEnvelope(metadata, QURAN_META_HAFS)
      await recordAudit('sdk.getMetadata', [{ source: evidence.source.id, contentHash: evidence.contentHash }])
      return { metadata, evidence }
    },

    async search(query: string, options: SdkSearchOptions = {}) {
      if (typeof query !== 'string' || query.trim() === '') throw new Error('query must be a non-empty string')
      const mode = options.mode === 'exact' ? 'exact' as const : 'skeleton' as const
      const surah = options.surah
      const limit = Math.min(Math.max(options.limit ?? 20, 1), 100)
      if (surah !== undefined && (!Number.isInteger(surah) || surah < 1 || surah > 114)) {
        throw new Error('surah must be an integer in 1..114')
      }
      if (mode === 'skeleton' && toSearchSkeleton(query) === '') {
        throw new Error('query has no searchable letters')
      }

      const [uthmani, imlaei] = await Promise.all([loadUthmaniVerses(), loadImlaeiVerses()])
      const result = searchVerses(uthmani, imlaei, query, mode, surah, limit)
      const transforms = mode === 'skeleton' ? [SKELETON_TRANSFORM] : []
      const evidence = createEnvelope(result, mode === 'skeleton' ? TANZIL_IMLAEI : TANZIL_UTHMANI, transforms)
      await recordAudit('sdk.search', [{ source: evidence.source.id, contentHash: evidence.contentHash }])
      return { result, evidence }
    },

    async compareRiwayat(surah: number, ayah?: number) {
      if (!Number.isInteger(surah) || surah < 1 || surah > 114) throw new Error('surah must be an integer in 1..114')
      const rows = computeRiwayatTable(surah, ayah)
      const hafsRow = rows.find(r => r.riwaya === 'hafs')!
      const differFromHafs = rows
        .filter(r => r.riwaya !== 'hafs' && (
          r.surahAyahCount !== hafsRow.surahAyahCount
          || r.totalAyahs !== hafsRow.totalAyahs
          || JSON.stringify(r.ayah) !== JSON.stringify(hafsRow.ayah)
        ))
        .map(r => r.riwaya)
      const evidence = createEnvelope({ surah, ayah, rows }, QURAN_META_RIWAYAT)
      await recordAudit('sdk.compareRiwayat', [{ source: evidence.source.id, contentHash: evidence.contentHash }])
      return { surah, rows, differFromHafs, evidence }
    },

    async convertAyah(surah: number, ayah: number, from: RiwayaName, to: RiwayaName) {
      if (!Number.isInteger(surah) || surah < 1 || surah > 114) throw new Error('surah must be an integer in 1..114')
      if (!Number.isInteger(ayah) || ayah < 1) throw new Error('ayah must be a positive integer')
      const converted = convertAyahBetween(surah, ayah, from, to)
      const payload = {
        from: { riwaya: from, reference: `${surah}:${ayah}` },
        to: { riwaya: to, reference: `${converted.surah}:${converted.ayah}`, surah: converted.surah, ayah: converted.ayah },
      }
      const evidence = createEnvelope(payload, QURAN_META_RIWAYAT)
      await recordAudit('sdk.convertAyah', [{ source: evidence.source.id, contentHash: evidence.contentHash }])
      return { ...payload, evidence }
    },

    async getPageLayout(page: number) {
      const spans = getPageComposition(page)
      if (spans === undefined) throw new Error(`page must be an integer in 1..${PAGE_COUNT}`)
      const payload = { page, spans, level: 'page-composition' as const }
      const evidence = createEnvelope(payload, QURAN_META_PAGES)
      await recordAudit('sdk.getPageLayout', [{ source: evidence.source.id, contentHash: evidence.contentHash }])
      return { ...payload, evidence }
    },

    async getAyahTiming(surah: number, ayah: number) {
      const row = await getTanzilVerse(surah, ayah)
      if (row === undefined) throw new Error(`verse ${surah}:${ayah} not found (Hafs numbering, 6236 verses)`)
      const timingDoc = await loadHusaryTiming()
      const span = ayahTiming(timingDoc, surah, ayah)!
      const timing = { reference: row.key, ...span, reciter: timingDoc.reciterName }
      const evidence = createEnvelope(timing, EVERYAYAH_TIMING_HUSARY, [TIMING_CONVENTION])
      await recordAudit('sdk.getAyahTiming', [{ source: evidence.source.id, contentHash: evidence.contentHash }])
      return {
        reference: row.key,
        timing,
        audioUrl: everyAyahUrl('Husary_128kbps', surah, ayah),
        evidence,
      }
    },

    async getAyahMorphology(surah: number, ayah: number) {
      const row = await getTanzilVerse(surah, ayah)
      if (row === undefined) throw new Error(`verse ${surah}:${ayah} not found (Hafs numbering, 6236 verses)`)
      const segments = await loadAyahSegments(surah, ayah)
      const words = groupByWord(segments)
      const evidence = createEnvelope({ reference: row.key, words }, QAC_MORPHOLOGY)
      await recordAudit('sdk.getAyahMorphology', [{ source: evidence.source.id, contentHash: evidence.contentHash }])
      return { reference: row.key, words, evidence }
    },

    async searchTopics(query: string, limit = 20) {
      if (typeof query !== 'string' || query.trim() === '') throw new Error('query must be a non-empty string')
      const capped = Math.min(Math.max(limit, 1), 50)
      const topics = await loadTopics()
      const matched = filterTopics(topics, query, capped)
      const evidence = createEnvelope({ query, matched }, QURANPEDIA_TOPICS)
      await recordAudit('sdk.searchTopics', [{ source: evidence.source.id, contentHash: evidence.contentHash }])
      return { query, topics: matched, evidence }
    },

    verifyEnvelope<T>(envelope: EvidenceEnvelope<T>, minTrust = minTrustLevel): EnvelopeIntegrityResult {
      return verifyEnvelopeIntegrity(envelope, minTrust)
    },
  }
}
