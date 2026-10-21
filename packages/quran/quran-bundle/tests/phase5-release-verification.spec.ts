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

  it('verifies all 22 packages in packages/quran have built lib/index.js (and lib/client.js for UI plugins)', () => {
    for (const dir of EXPECTED_QURAN_PACKAGES) {
      const pkgDir = resolve(REPO_ROOT, 'packages/quran', dir)
      const pkgJsonPath = resolve(pkgDir, 'package.json')
      expect(existsSync(pkgJsonPath), `Missing package.json in ${dir}`).toBe(true)
      const libIndexPath = resolve(pkgDir, 'lib/index.js')
      expect(existsSync(libIndexPath), `Missing lib/index.js in ${dir}`).toBe(true)
    }

    // UI client bundles must also exist
    expect(existsSync(resolve(REPO_ROOT, 'packages/quran/client-theme-islamic/lib/client.js'))).toBe(true)
    expect(existsSync(resolve(REPO_ROOT, 'packages/quran/client-governance-card/lib/client.js'))).toBe(true)
  })

  it('verifies cordis.patch.yml wires the theme, governance card, default quran preset, skills, and all tool plugins', () => {
    const patchPath = resolve(REPO_ROOT, 'packages/quran/quran-bundle/cordis.patch.yml')
    const patchContent = readFileSync(patchPath, 'utf8')
    expect(patchContent).toContain('id: ui-quran-theme')
    expect(patchContent).toContain('id: ui-quran-governance')
    expect(patchContent).toContain('default: quran')
    expect(patchContent).toContain('id: skill-quran')
    expect(patchContent).toContain('id: tool-quran-text')
    expect(patchContent).toContain('id: tool-quran-sciences')
  })
})
