/**
 * Evidence governance core for the Quran Harness.
 *
 * Every piece of Quranic or reference data that flows through the harness is
 * wrapped in an EvidenceEnvelope before it reaches the model or the UI. The
 * envelope carries the source, a content hash, the retrieval timestamp, the
 * applied transform chain and the source trust level, so no answer is ever
 * presented without a verifiable provenance record.
 *
 * @module @deepseek-ai/dsh-quran-evidence
 */

import { createHash } from 'node:crypto'
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/** Trust levels for sources, ordered from most to least authoritative. */
export type TrustLevel = 'L1-official' | 'L2-verified-open' | 'L3-community' | 'L4-experimental'

/** A named, addressable data source declared in the evidence policy. */
export interface SourceDescriptor {
  /** Stable source identifier, e.g. `tanzil-uthmani`. */
  readonly id: string
  /** Human-readable source name. */
  readonly name: string
  /** Canonical URL of the source. */
  readonly url: string
  /** Trust level assigned by policy. */
  readonly trust: TrustLevel
  /** Exact version or retrieval date of the pinned artifact, when known. */
  readonly version?: string
}

/** One recorded transformation applied to fetched content (e.g. normalization). */
export interface TransformRecord {
  /** Transform identifier, e.g. `unicode-nfc`, `strip-diacritics`. */
  readonly id: string
  /** Free-form parameters or notes. */
  readonly detail?: string | undefined
}

/**
 * The mandatory provenance wrapper around any fetched payload.
 * `contentHash` is SHA-256 over the exact payload bytes in `payload`.
 */
export interface EvidenceEnvelope<T = unknown> {
  /** Envelope schema version. */
  readonly kind: 'evidence-envelope/v1'
  /** Source the payload was fetched from. */
  readonly source: SourceDescriptor
  /** SHA-256 hex digest of the canonical payload serialization. */
  readonly contentHash: string
  /** ISO-8601 retrieval timestamp. */
  readonly retrievedAt: string
  /** Ordered transform chain applied after retrieval. */
  readonly transforms: readonly TransformRecord[]
  /** The wrapped payload. */
  readonly payload: T
}

/** Outcome of comparing two envelopes that should carry identical content. */
export interface CrossVerification {
  /** Whether the two payloads matched after the stated normalization. */
  readonly match: boolean
  /** Hash of the left payload. */
  readonly leftHash: string
  /** Hash of the right payload. */
  readonly rightHash: string
  /** Normalization transform applied before comparison, when any. */
  readonly normalization?: TransformRecord | undefined
  /** Human-readable verdict. */
  readonly verdict: string
}

/** Compute the SHA-256 hex digest of a UTF-8 string or buffer. */
export function sha256(content: string | Uint8Array): string {
  return createHash('sha256').update(content).digest('hex')
}

/** Canonical serialization used for hashing payloads. */
export function canonicalize(payload: unknown): string {
  return typeof payload === 'string' ? payload : JSON.stringify(payload)
}

/** Wrap a payload in a fresh evidence envelope. */
export function createEnvelope<T>(
  payload: T,
  source: SourceDescriptor,
  transforms: readonly TransformRecord[] = [],
  now: Date = new Date(),
): EvidenceEnvelope<T> {
  return {
    kind: 'evidence-envelope/v1',
    source,
    contentHash: sha256(canonicalize(payload)),
    retrievedAt: now.toISOString(),
    transforms,
    payload,
  }
}

/**
 * Compare two envelopes for content equality. When the two sources apply
 * different diacritic conventions, pass a `normalization` transform whose
 * function was already applied to both payloads before envelope creation.
 */
export function crossVerify(left: EvidenceEnvelope, right: EvidenceEnvelope, normalization?: TransformRecord): CrossVerification {
  const match = left.contentHash === right.contentHash
  return {
    match,
    leftHash: left.contentHash,
    rightHash: right.contentHash,
    normalization,
    verdict: match
      ? `MATCH: ${left.source.id} and ${right.source.id} agree (hash ${left.contentHash.slice(0, 12)}…)`
      : `MISMATCH: ${left.source.id} (${left.contentHash.slice(0, 12)}…) != ${right.source.id} (${right.contentHash.slice(0, 12)}…) — do NOT present silently`,
  }
}

/** One append-only audit record. */
export interface AuditRecord {
  readonly at: string
  readonly operation: string
  readonly envelopes: readonly { source: string; contentHash: string }[]
  readonly verification?: CrossVerification
}

/**
 * Append one record to the append-only audit log (JSON Lines).
 * The log path is supplied by policy; callers never rewrite history.
 */
export async function appendAuditLog(logPath: string, record: AuditRecord): Promise<void> {
  await mkdir(dirname(logPath), { recursive: true })
  await appendFile(logPath, JSON.stringify(record) + '\n', 'utf8')
}

/** Evidence policy: approved sources and governance rules. */
export interface EvidencePolicy {
  /** Policy schema version. */
  readonly version: 1
  /** Approved sources by id. Fetching from an undeclared id is rejected. */
  readonly sources: readonly SourceDescriptor[]
  /** Whether Quranic text requires two-source cross-verification (always true in practice). */
  readonly requireCrossVerification: boolean
  /** Minimum trust level acceptable for Quranic text display. */
  readonly minTrustForQuranText: TrustLevel
}

const TRUST_ORDER: readonly TrustLevel[] = ['L1-official', 'L2-verified-open', 'L3-community', 'L4-experimental']

/** Whether `level` is at least as trusted as `minimum`. */
export function trustAtLeast(level: TrustLevel, minimum: TrustLevel): boolean {
  return TRUST_ORDER.indexOf(level) <= TRUST_ORDER.indexOf(minimum)
}

/** Load and validate an evidence policy from a JSON file. */
export async function loadPolicy(path: string): Promise<EvidencePolicy> {
  const raw = JSON.parse(await readFile(path, 'utf8')) as EvidencePolicy
  if (raw.version !== 1) throw new Error(`unsupported evidence policy version: ${raw.version}`)
  if (!Array.isArray(raw.sources) || raw.sources.length === 0) throw new Error('evidence policy must declare at least one source')
  return raw
}

/** Resolve a source descriptor from the policy, or throw for undeclared sources. */
export function requireSource(policy: EvidencePolicy, id: string): SourceDescriptor {
  const source = policy.sources.find(s => s.id === id)
  if (!source) throw new Error(`source not approved by evidence policy: ${id}`)
  return source
}

/** Serialize an envelope for storage or transport. */
export async function writeEnvelope(path: string, envelope: EvidenceEnvelope): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(envelope, null, 2), 'utf8')
}
