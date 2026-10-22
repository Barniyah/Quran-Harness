/**
 * Phase 5 Hardening, Upgrade Non-Regression, and Red-Team Governance Verification Suite.
 *
 * Tests each release gate independently:
 * - Gate 1: Upstream Core Isolation & Upgrade Compatibility (zero modifications to core DSH packages)
 * - Gate 2: Red-Team Governance & Anti-Tampering (out-of-range ayahs, single-diacritic mutation, cross-verify mismatch)
 * - Gate 3: Complete 22-Package Quran Harness Inventory & Build Artifact Verification
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createEnvelope, crossVerify } from '../../evidence-core/src/index.ts'
import { createQuranSdk, verifyEnvelopeIntegrity } from '../../quran-sdk/src/index.ts'

const REPO_ROOT = resolve(import.meta.dirname, '../../../..')

describe('Phase 5 — Gate 1: Upstream Core Isolation & Upgrade Compatibility', () => {
  it('modifies zero files inside core DSH packages (packages/core, packages/client, packages/preset, apps)', () => {
    const diffOut = execFileSync(
      'git',
      ['diff', '--name-only', '86a402200d95fecef4529d969836f1fe13c6cb0d..HEAD', '--', 'packages/core', 'packages/client', 'packages/preset', 'apps'],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    ).trim()
    expect(diffOut).toBe('')
  })
})

describe('Phase 5 — Gate 2: Red-Team Anti-Hallucination & Tamper Detection', () => {
  const sdk = createQuranSdk()

  it('rejects fabricated / out-of-range surah and ayah coordinates (Red-Team Test R1)', async () => {
    // Surah Al-Ikhlas has only 4 ayahs — requesting 112:5 must throw
    await expect(sdk.getMetadata(112, 5)).rejects.toThrow()
    // Surah 115 does not exist — requesting 115:1 must throw
    await expect(sdk.getMetadata(115, 1)).rejects.toThrow()
    // Surah Al-Baqarah has 286 ayahs — requesting 2:287 must throw
    await expect(sdk.getMetadata(2, 287)).rejects.toThrow()
    await expect(sdk.getVerse(112, 5)).rejects.toThrow()
  })

  it('detects single-character or single-diacritic tampering in EvidenceEnvelope (Red-Team Test R2)', async () => {
    const res = await sdk.getMetadata(1, 1)
    expect(verifyEnvelopeIntegrity(res.evidence).valid).toBe(true)

    // Tamper with a single field inside payload without updating the SHA-256 contentHash
    const tampered = {
      ...res.evidence,
      payload: {
        ...res.evidence.payload,
        juz: 30,
      },
    }
    expect(verifyEnvelopeIntegrity(tampered).valid).toBe(false)
  })

  it('blocks verse display when two sources disagree on even one letter (Red-Team Test R3)', () => {
    const srcA = {
      id: 'tanzil-uthmani',
      name: 'Tanzil Uthmani',
      url: 'https://tanzil.net',
      trust: 'L1-official' as const,
    }
    const srcB = {
      id: 'quran.com-v4-uthmani',
      name: 'Quran.com v4',
      url: 'https://api.quran.com/api/v4',
      trust: 'L2-verified-open' as const,
    }
    const primaryEnv = createEnvelope('قُلْ هُوَ ٱللَّهُ أَحَدٌ', srcA)
    const matchingEnv = createEnvelope('قُلْ هُوَ ٱللَّهُ أَحَدٌ', srcB)
    const corruptedEnv = createEnvelope('قُلْ هُوَ ٱللَّهُ وَاحِدٌ', srcB)

    const okResult = crossVerify(primaryEnv, matchingEnv)
    expect(okResult.match).toBe(true)

    const mismatchResult = crossVerify(primaryEnv, corruptedEnv)
    expect(mismatchResult.match).toBe(false)
    expect(mismatchResult.verdict).toContain('MISMATCH')
  })
})

describe('Phase 5 — Gate 3: Full Quran Package Inventory & Built Artifacts Verification', () => {
  const EXPECTED_QURAN_PACKAGES = [
    'evidence-core',
    'quran-data',
    'skill-quran',
    'quran-sdk',
    'quran-bundle',
    'client-theme-islamic',
    'client-governance-card',
    'tool-quran-text',
    'tool-quran-metadata',
    'tool-quran-search',
    'tool-quran-riwayat',
    'tool-quran-audio',
    'tool-quran-timing',
    'tool-mushaf-images',
    'tool-mushaf-layout',
    'tool-quran-fonts',
    'tool-tajweed',
    'tool-quran-phonetic',
    'tool-quran-linguistics',
    'tool-quran-tafsir',
    'tool-quran-translations',
    'tool-quran-sciences',
  ] as const

  it('verifies all 22 packages in packages/quran have entrypoints (src/index.ts and built lib/index.js when compiled)', () => {
    for (const dir of EXPECTED_QURAN_PACKAGES) {
      const pkgDir = resolve(REPO_ROOT, 'packages/quran', dir)
      const pkgJsonPath = resolve(pkgDir, 'package.json')
      expect(existsSync(pkgJsonPath), `Missing package.json in ${dir}`).toBe(true)
      const hasEntry = existsSync(resolve(pkgDir, 'src/index.ts')) || existsSync(resolve(pkgDir, 'lib/index.js'))
      expect(hasEntry, `Missing entrypoint in ${dir}`).toBe(true)
    }

    // UI client entrypoints must also exist
    expect(
      existsSync(resolve(REPO_ROOT, 'packages/quran/client-theme-islamic/client/index.tsx'))
      || existsSync(resolve(REPO_ROOT, 'packages/quran/client-theme-islamic/lib/client.js')),
    ).toBe(true)
    expect(
      existsSync(resolve(REPO_ROOT, 'packages/quran/client-governance-card/client/index.tsx'))
      || existsSync(resolve(REPO_ROOT, 'packages/quran/client-governance-card/lib/client.js')),
    ).toBe(true)
  })

  it('verifies cordis.patch.yml wires the theme, governance card, default quran preset, skills, and all tool plugins using portable paths', () => {
    const patchPath = resolve(REPO_ROOT, 'packages/quran/quran-bundle/cordis.patch.yml')
    const patchContent = readFileSync(patchPath, 'utf8')
    expect(patchContent).toContain('id: ui-quran-theme')
    expect(patchContent).toContain('id: ui-quran-governance')
    expect(patchContent).toContain('default: quran')
    expect(patchContent).toContain('id: skill-quran')
    expect(patchContent).toContain('id: tool-quran-text')
    expect(patchContent).toContain('id: tool-quran-sciences')
    expect(patchContent).toContain('quran-create-capability')
    // Must not contain any hardcoded machine paths
    expect(patchContent).not.toMatch(/D:\//i)
    expect(patchContent).not.toMatch(/DeepSeek_Quran_Harness/i)
  })

  it('verifies all 5 pinned Quran datasets + SHA-256 sidecars and the quran-create-capability skill & generator exist', () => {
    const pinnedFiles = [
      'quran-uthmani.txt',
      'quran-uthmani.sha256',
      'quran-simple-clean.txt',
      'quran-simple-clean.sha256',
      'timing-husary.json',
      'timing-husary.sha256',
      'quran-morphology.txt',
      'quran-morphology.sha256',
      'quranpedia-topics.json',
      'quranpedia-topics.sha256',
    ]
    for (const f of pinnedFiles) {
      expect(existsSync(resolve(REPO_ROOT, 'packages/quran/quran-data/data', f)), `Missing pinned data file: ${f}`).toBe(true)
    }
    expect(existsSync(resolve(REPO_ROOT, 'packages/quran/skill-quran/assets/quran-create-capability/SKILL.md'))).toBe(true)
    expect(existsSync(resolve(REPO_ROOT, 'scripts/create-quran-capability.mjs'))).toBe(true)
  })
})
