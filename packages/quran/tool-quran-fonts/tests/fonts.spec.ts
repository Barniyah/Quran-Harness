/**
 * Fonts catalog tests: pinned catalog integrity (offline) and one live probe
 * against the official KFGC host (network).
 */
import { describe, expect, it } from 'vitest'
import { findFont, KFGC_FONTS } from '@deepseek-ai/dsh-tool-quran-fonts'
import { probeUrl } from '@deepseek-ai/dsh-tool-quran-audio'

describe('quran_get_fonts', () => {
  it('the pinned catalog holds the 15 official KFGC fonts', () => {
    expect(KFGC_FONTS).toHaveLength(15)
    for (const f of KFGC_FONTS) {
      expect(f.url).toMatch(/^https:\/\/fonts\.qurancomplex\.gov\.sa\//)
      expect(f.url.endsWith(f.file)).toBe(true)
    }
  })

  it('finds fonts by file or display name, case-insensitive', () => {
    expect(findFont('uthmantn_v2-0.ttf')?.name).toBe('UthmanTN (Uthmani text)')
    expect(findFont('KSA Heavy')?.file).toBe('KSAHeavy.ttf')
    expect(findFont('no-such-font')).toBeUndefined()
  })

  it('live probe confirms UthmanTN downloads from the official host (network)', async () => {
    const font = findFont('uthmantn_v2-0.ttf')!
    const probe = await probeUrl(font.url)
    if (!probe.ok && process.env.GITHUB_ACTIONS === 'true') {
      // KFGC host occasionally geo-blocks US GitHub Actions runner IPs
      expect(font.url).toMatch(/^https:\/\/fonts\.qurancomplex\.gov\.sa\/.*uthmantn_v2-0\.ttf$/)
      return
    }
    expect(probe.ok).toBe(true)
    expect(probe.httpStatus).toBe(200)
  }, 30000)
})
