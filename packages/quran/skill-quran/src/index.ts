/**
 * Bundled Quranic development and research skills for the Quran Harness preset.
 *
 * Registers the four default skills mandated by `PLAN.md` §5 on `ctx.skills`
 * under the `dsh-quran` provider at {@link BUNDLED_SKILL_RANK}:
 * - `quran-mushaf-app`: building evidence-governed Mushaf reader applications
 * - `quran-recitation-feature`: audio playback, Husary timing & algorithmic Tajweed
 * - `quran-verified-research`: scholarly search, morphology, topics & named Tafsir
 * - `quran-compare-riwayat`: structural comparison & coordinate conversion across 8 riwayat
 *
 * @module @deepseek-ai/dsh-skill-quran
 */

import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { isAbsolute, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { BUNDLED_SKILL_RANK, type SkillCandidate, type SkillProvider } from '@deepseek-ai/dsh-skill'
import { parse as parseYaml } from 'yaml'

/** Identifiers of the default Quranic skills shipped with the preset. */
export const QURAN_SKILL_NAMES = [
  'quran-mushaf-app',
  'quran-recitation-feature',
  'quran-verified-research',
  'quran-compare-riwayat',
] as const

export type QuranSkillName = typeof QURAN_SKILL_NAMES[number]

/** Configuration for the bundled Quran skill provider. */
export interface Config {
  /** Optional absolute assets directory containing the skill folders; defaults to packaged `assets/`. */
  assetRoot?: string
}

/** Validated configuration schema. */
export const Config: z<Config> = z.object({
  assetRoot: z.string().min(1),
})

/** Cordis plugin identity. */
export const name = 'skill-quran'
/** Required service injection. */
export const inject = ['skills']

/** Parse and validate YAML frontmatter and body of one bundled `SKILL.md` file. */
export function parseQuranSkill(raw: string, path: string): { name: string; description: string; content: string } {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(raw)
  if (frontmatter?.[1] === undefined) throw new Error(`skill-quran: ${path} has no YAML frontmatter`)
  const metadata: unknown = parseYaml(frontmatter[1])
  const parsedName = typeof metadata === 'object' && metadata !== null && 'name' in metadata
    ? metadata.name
    : undefined
  const description = typeof metadata === 'object' && metadata !== null && 'description' in metadata
    ? metadata.description
    : undefined
  if (typeof parsedName !== 'string' || parsedName.length === 0) {
    throw new Error(`skill-quran: ${path} has no name`)
  }
  if (typeof description !== 'string' || description.length === 0) {
    throw new Error(`skill-quran: ${path} has no description`)
  }
  return { name: parsedName, description, content: raw.slice(frontmatter[0].length).trim() }
}

/**
 * Register the default Quran Harness skills on `ctx.skills`.
 * @param ctx - Cordis context carrying `ctx.skills`.
 * @param config - Optional override for `assetRoot`.
 */
export function apply(ctx: Context, config: Config = {}): void {
  const assetRoot = config.assetRoot ?? fileURLToPath(new URL('../assets/', import.meta.url))
  if (!isAbsolute(assetRoot)) throw new Error('skill-quran: assetRoot must be an absolute directory')

  const candidates: SkillCandidate[] = QURAN_SKILL_NAMES.map((skillName) => {
    const directory = join(assetRoot, skillName)
    const path = join(directory, 'SKILL.md')
    const { description } = parseQuranSkill(readFileSync(path, 'utf8'), path)
    return {
      name: skillName,
      description,
      invocation: { modelInvocable: true, userInvocable: true },
      provider: 'dsh-quran',
      source: 'bundled',
      rank: BUNDLED_SKILL_RANK,
      resourceBase: { kind: 'directory', path: directory.split(sep).join('/') },
      locator: path,
    }
  })

  const provider: SkillProvider = {
    name: 'dsh-quran',
    list: () => Promise.resolve(candidates),
    async get(candidate, options) {
      const { rank: _rank, locator, ...summary } = candidate
      const raw = await readFile(locator as string, { encoding: 'utf8', signal: options.signal })
      const { content } = parseQuranSkill(raw, locator as string)
      return { ...summary, content }
    },
  }

  ctx.skills.registerProvider(() => provider)
}
