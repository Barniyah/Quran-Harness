#!/usr/bin/env node
/**
 * Automated Quran Capability Scaffolder & Governance Wiring Tool
 * (Used by the `quran-create-capability` bundled skill)
 *
 * Scaffolds a new Quran tool package under `packages/quran/<pkg>/` with:
 * 1. Mandatory SHA-256 `EvidenceEnvelope` + `appendAuditLog` (`@deepseek-ai/dsh-quran-evidence`)
 * 2. Pinned Hafs coordinate verification (`@deepseek-ai/dsh-quran-data`)
 * 3. Automatic registration in `packages/quran/client-governance-card/src/client/index.ts`
 * 4. Automatic portable registration in `packages/quran/quran-bundle/cordis.patch.yml`
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function parseArgs(argv) {
  const out = {}
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true'
      out[key] = val
    }
  }
  return out
}

const args = parseArgs(process.argv)

if (args.help || !args.pkg || !args.tool) {
  console.log(`Usage:
  node scripts/create-quran-capability.mjs \\
    --pkg tool-quran-<slug> \\
    --tool quran_<tool_name> \\
    [--source-id <id>] \\
    [--source-name "<name>"] \\
    [--source-url "<url>"] \\
    [--trust L1-official|L2-verified-open|L3-community] \\
    [--description "<description>"]
`)
  process.exit(args.help ? 0 : 1)
}

const pkgDirName = args.pkg.startsWith('tool-') ? args.pkg : `tool-quran-${args.pkg}`
const toolName = args.tool.startsWith('quran_') ? args.tool : `quran_${args.tool}`
const sourceId = args['source-id'] ?? `${pkgDirName}-source`
const sourceName = args['source-name'] ?? `Verified Quran Capability (${toolName})`
const sourceUrl = args['source-url'] ?? 'https://tanzil.net'
const trust = args.trust ?? 'L2-verified-open'
const description = args.description ?? `Evidence-governed Quran capability (${toolName}). Always show the governance card.`

const pkgDir = join(REPO_ROOT, 'packages/quran', pkgDirName)
if (existsSync(pkgDir)) {
  console.error(`Error: Package directory already exists: ${pkgDir}`)
  process.exit(1)
}

mkdirSync(join(pkgDir, 'src'), { recursive: true })
mkdirSync(join(pkgDir, 'tests'), { recursive: true })

// 1. package.json
const pkgJson = {
  name: `@deepseek-ai/dsh-${pkgDirName}`,
  description,
  version: '0.2.1-alpha.4',
  private: true,
  type: 'module',
  main: 'lib/index.js',
  types: 'lib/types/index.d.ts',
  exports: {
    '.': {
      types: './lib/types/index.d.ts',
      default: './lib/index.js',
    },
    './src/*': './src/*',
    './package.json': './package.json',
  },
  files: ['lib/index.js', 'lib/types/**/*.d.ts'],
  license: 'MIT',
  peerDependencies: {
    '@deepseek-ai/cordis': 'workspace:~',
    '@deepseek-ai/dsh-tools': 'workspace:*',
  },
  dependencies: {
    '@deepseek-ai/dsh-quran-data': 'workspace:*',
    '@deepseek-ai/dsh-quran-evidence': 'workspace:*',
  },
  devDependencies: {
    '@deepseek-ai/cordis': 'workspace:~',
    '@deepseek-ai/dsh-tools': 'workspace:*',
  },
}
writeFileSync(join(pkgDir, 'package.json'), JSON.stringify(pkgJson, null, 2) + '\n')

// 2. tsconfig.json
const tsconfig = {
  extends: '../../../tsconfig.base.json',
  compilerOptions: {
    rootDir: 'src',
    outDir: 'lib',
    declarationDir: 'lib/types',
  },
  include: ['src'],
}
writeFileSync(join(pkgDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2) + '\n')

// 3. src/index.ts with mandatory EvidenceEnvelope & Audit Log
const srcIndex = `/**
 * ${description}
 *
 * Automatically wired to the Quran Harness Governance Layer:
 * - Coordinate validation via @deepseek-ai/dsh-quran-data
 * - SHA-256 EvidenceEnvelope + append-only audit log via @deepseek-ai/dsh-quran-evidence
 * - Browser UI GovernanceCard presentationMeta
 *
 * @module @deepseek-ai/dsh-${pkgDirName}
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { SourceDescriptor } from '@deepseek-ai/dsh-quran-evidence'
import { appendAuditLog, createEnvelope } from '@deepseek-ai/dsh-quran-evidence'
import { getVerse } from '@deepseek-ai/dsh-quran-data'

export const name = '${pkgDirName}'
export const inject = ['tools']

export interface Config {
  auditLogPath?: string
}

export const SOURCE_DESCRIPTOR: SourceDescriptor = {
  id: '${sourceId}',
  name: '${sourceName.replace(/'/g, "\\'")}',
  url: '${sourceUrl}',
  trust: '${trust}',
}

export function apply(ctx: Context, config: Config = {}): void {
  const auditLogPath = config.auditLogPath ?? 'evidence-audit.jsonl'

  ctx.tools.register(defineTool({
    name: '${toolName}',
    description: '${description.replace(/'/g, "\\'")}',
    parameters: {
      surah: { type: 'number', required: true, description: 'Surah number, 1-114' },
      ayah: { type: 'number', required: true, description: 'Ayah number within the surah' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          reference: { type: 'string', required: true },
          data: { type: 'object', additionalProperties: true, required: true },
          evidence: { type: 'object', additionalProperties: true, required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
      presentationMeta: (_args, value) => ({
        reference: value.reference,
        status: 'ok',
        source: SOURCE_DESCRIPTOR.id,
        contentHash: (value.evidence as { contentHash?: string })?.contentHash,
        retrievedAt: (value.evidence as { retrievedAt?: string })?.retrievedAt,
        verdict: \`VERIFIED (\${SOURCE_DESCRIPTOR.trust})\`,
      }),
    },
    async execute(args) {
      const { surah, ayah } = args
      const row = await getVerse(surah, ayah)
      if (row === undefined) {
        throw new Error(\`verse \${surah}:\${ayah} not found (Hafs numbering, 6236 verses)\`)
      }

      const payload = {
        reference: row.key,
        surah,
        ayah,
        uthmaniText: row.text,
      }
      const evidence = createEnvelope(payload, SOURCE_DESCRIPTOR)
      await appendAuditLog(auditLogPath, {
        at: new Date().toISOString(),
        operation: '${toolName}',
        envelopes: [{ source: evidence.source.id, contentHash: evidence.contentHash }],
      })

      return {
        reference: row.key,
        data: payload,
        evidence: JSON.parse(JSON.stringify(evidence)),
      }
    },
  }))
}
`
writeFileSync(join(pkgDir, 'src/index.ts'), srcIndex)

// 4. tests/<slug>.spec.ts
const testContent = `import { describe, expect, it } from 'vitest'
import { createEnvelope } from '@deepseek-ai/dsh-quran-evidence'
import { getVerse } from '@deepseek-ai/dsh-quran-data'
import { SOURCE_DESCRIPTOR } from '../src/index.ts'

describe('${toolName} governance verification', () => {
  it('wraps verified verse data in a SHA-256 EvidenceEnvelope', async () => {
    const row = await getVerse(1, 1)
    expect(row).toBeDefined()
    const env = createEnvelope({ reference: row!.key, text: row!.text }, SOURCE_DESCRIPTOR)
    expect(env.source.id).toBe('${sourceId}')
    expect(env.contentHash).toMatch(/^[a-f0-9]{64}$/)
  })
})
`
writeFileSync(join(pkgDir, `tests/${pkgDirName}.spec.ts`), testContent)

// 5. Wire into GovernanceCard (packages/quran/client-governance-card/src/client/index.ts)
const govCardPath = join(REPO_ROOT, 'packages/quran/client-governance-card/src/client/index.ts')
if (existsSync(govCardPath)) {
  const govSrc = readFileSync(govCardPath, 'utf8')
  if (!govSrc.includes(`'${toolName}'`)) {
    const updatedGov = govSrc.replace(
      /(\['quran_get_verse'[^\]]*)\]/,
      `$1, '${toolName}']`,
    )
    writeFileSync(govCardPath, updatedGov)
    console.log(`✅ Wired '${toolName}' into GovernanceCard (${govCardPath})`)
  }
}

// 6. Wire into cordis.patch.yml (packages/quran/quran-bundle/cordis.patch.yml)
const patchPath = join(REPO_ROOT, 'packages/quran/quran-bundle/cordis.patch.yml')
if (existsSync(patchPath)) {
  const patchSrc = readFileSync(patchPath, 'utf8')
  if (!patchSrc.includes(`id: ${pkgDirName}`)) {
    const marker = '          # --- Standard capability set (unchanged from the standard preset) ---'
    const entryYaml = [
      `          - id: ${pkgDirName}`,
      `            name: '../${pkgDirName}/lib/index.js'`,
      marker,
    ].join('\n')
    const updatedPatch = patchSrc.replace(marker, entryYaml)
    writeFileSync(patchPath, updatedPatch)
    console.log(`✅ Wired '${pkgDirName}' into cordis.patch.yml (${patchPath})`)
  }
}

console.log(`✅ Created governed Quran capability package: ${pkgDir}`)
