/**
 * Mushaf images tool: printed-page images (QuranHub KFGQPC Hafs set) and
 * per-ayah PNGs (Quran.com image_url / EveryAyah fallback). Every URL is
 * probed live (HTTP HEAD) and the probe is recorded inside the evidence
 * envelope — no unverified image link ever leaves the harness.
 *
 * @module @deepseek-ai/dsh-tool-mushaf-images
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { SourceDescriptor } from '@deepseek-ai/dsh-quran-evidence'
import { appendAuditLog, createEnvelope } from '@deepseek-ai/dsh-quran-evidence'
import { getVerse } from '@deepseek-ai/dsh-quran-data'
import { probeUrl } from '@deepseek-ai/dsh-tool-quran-audio'

export const name = 'tool-mushaf-images'
export const inject = ['tools']

/** Plugin configuration. */
export interface Config {
  /** Path of the append-only audit log. Defaults to `evidence-audit.jsonl` in the working directory. */
  auditLogPath?: string
}

const QURANHUB_PAGES: SourceDescriptor = {
  id: 'quranhub-pages-kfgqpc-hafs',
  name: 'QuranHub quran-pages-images — KFGQPC Hafs (wasat) printed pages',
  url: 'https://github.com/QuranHub/quran-pages-images',
  trust: 'L3-community',
}

const EVERYAYAH_PNG: SourceDescriptor = {
  id: 'everyayah-quranpngs',
  name: 'EveryAyah quranpngs — per-ayah Uthmani PNG images',
  url: 'https://everyayah.com/data/quranpngs/',
  trust: 'L3-community',
}

/** Printed mushaf page count in the Hafs KFGQPC (Medina mushaf) layout. */
export const MUSHAF_PAGE_COUNT = 604

/** Build the QuranHub printed-page image URL. Exported for tests. */
export function pageImageUrl(page: number): string {
  return `https://raw.githubusercontent.com/QuranHub/quran-pages-images/main/kfgqpc/hafs-wasat/${page}.jpg`
}

/** Build the EveryAyah per-ayah PNG URL. Exported for tests.
 *  Note: Quran.com's image_url CDN (rackcdn) failed TLS/probe from our
 *  environment on 2026-10-17 — evidence recorded in PROGRESS.md — so the
 *  primary ayah-image source is EveryAyah's quranpngs set. */
export function ayahImageUrl(surah: number, ayah: number): string {
  return `${EVERYAYAH_PNG.url}${surah}_${ayah}.png`
}

export function apply(ctx: Context, config: Config = {}) {
  const auditLogPath = config.auditLogPath ?? 'evidence-audit.jsonl'

  ctx.tools.register(defineTool({
    name: 'quran_get_page_image',
    description: 'Get the printed mushaf page image (JPEG) for a page number (1-604, Hafs KFGQPC Medina layout) from the QuranHub pages set, live-probed before returning. Always show the governance card.',
    parameters: {
      page: { type: 'number', required: true, description: 'Mushaf page number, 1-604' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          url: { type: 'string', required: true },
          page: { type: 'number', required: true },
          available: { type: 'boolean', required: true },
          evidence: { type: 'object', additionalProperties: true, required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => [{
        type: 'text' as const,
        text: value.available
          ? `Mushaf page ${value.page}: ${value.url}\n\n[Governance card] source: QuranHub KFGQPC pages | live probe OK | envelope in metadata`
          : `Page ${value.page} image is NOT reachable right now. Do not present the URL as working.`,
      }],
      presentationMeta: (_args, value) => ({
        reference: `page ${value.page}`,
        status: value.available ? 'ok' : 'mismatch',
        source: QURANHUB_PAGES.id,
        url: value.url,
      }),
    },
    async execute(args, exec) {
      const { page } = args
      if (!Number.isInteger(page) || page < 1 || page > MUSHAF_PAGE_COUNT) {
        throw new Error(`page must be an integer in 1..${MUSHAF_PAGE_COUNT}`)
      }
      const url = pageImageUrl(page)
      const probe = await probeUrl(url, exec.signal)
      const evidence = createEnvelope({ url, probe }, QURANHUB_PAGES)
      await appendAuditLog(auditLogPath, {
        at: new Date().toISOString(),
        operation: 'quran_get_page_image',
        envelopes: [{ source: evidence.source.id, contentHash: evidence.contentHash }],
      })
      return { url, page, available: probe.ok, evidence: JSON.parse(JSON.stringify(evidence)) }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'quran_get_ayah_image',
    description: 'Get the rendered PNG image of one ayah (Uthmani text image) from the EveryAyah quranpngs set, live-probed before returning. Always show the governance card. The verse is validated against the pinned Tanzil artifact (Hafs numbering).',
    parameters: {
      surah: { type: 'number', required: true, description: 'Surah number, 1-114' },
      ayah: { type: 'number', required: true, description: 'Ayah number within the surah' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          url: { type: 'string', required: true },
          reference: { type: 'string', required: true },
          available: { type: 'boolean', required: true },
          evidence: { type: 'object', additionalProperties: true, required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => [{
        type: 'text' as const,
        text: value.available
          ? `Ayah ${value.reference} image: ${value.url}\n\n[Governance card] source: EveryAyah quranpngs | live probe OK | envelope in metadata`
          : `Ayah ${value.reference} image is NOT reachable right now. Do not present the URL as working.`,
      }],
      presentationMeta: (_args, value) => ({
        reference: value.reference,
        status: value.available ? 'ok' : 'mismatch',
        source: EVERYAYAH_PNG.id,
        url: value.url,
      }),
    },
    async execute(args, exec) {
      const { surah, ayah } = args
      const row = await getVerse(surah, ayah)
      if (row === undefined) throw new Error(`verse ${surah}:${ayah} not found (Hafs numbering, 6236 verses)`)
      const url = ayahImageUrl(surah, ayah)
      const probe = await probeUrl(url, exec.signal)
      const evidence = createEnvelope({ url, probe }, EVERYAYAH_PNG)
      await appendAuditLog(auditLogPath, {
        at: new Date().toISOString(),
        operation: 'quran_get_ayah_image',
        envelopes: [{ source: evidence.source.id, contentHash: evidence.contentHash }],
      })
      return { url, reference: row.key, available: probe.ok, evidence: JSON.parse(JSON.stringify(evidence)) }
    },
  }))
}
