import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { SkillProvider } from '@deepseek-ai/dsh-skill'
import { apply, parseQuranSkill, QURAN_SKILL_NAMES } from '../src/index.ts'

describe('@deepseek-ai/dsh-skill-quran', () => {
  it('registers all 4 default Quran skills and loads their full markdown bodies', async () => {
    let registeredProvider: SkillProvider | undefined
    const fakeCtx = {
      skills: {
        registerProvider(factory: () => SkillProvider) {
          registeredProvider = factory()
        },
      },
    } as unknown as Context

    apply(fakeCtx)
    expect(registeredProvider).toBeDefined()
    expect(registeredProvider!.name).toBe('dsh-quran')

    const listResult = await registeredProvider!.list({})
    const candidates = Array.isArray(listResult) ? listResult : listResult.candidates
    expect(candidates.map(c => c.name)).toEqual([...QURAN_SKILL_NAMES])

    for (const candidate of candidates) {
      expect(candidate.source).toBe('bundled')
      expect(candidate.invocation).toEqual({ modelInvocable: true, userInvocable: true })
      const full = await registeredProvider!.get(candidate, {})
      expect(full).toBeDefined()
      expect(full!.name).toBe(candidate.name)
      expect(full!.content.length).toBeGreaterThan(200)
      expect(full!.content).toContain('# ')
    }
  })

  it('rejects relative assetRoot and malformed SKILL.md frontmatter', () => {
    const fakeCtx = {
      skills: { registerProvider: () => {} },
    } as unknown as Context

    expect(() => apply(fakeCtx, { assetRoot: 'relative/path' })).toThrow('assetRoot must be an absolute directory')
    expect(() => parseQuranSkill('no frontmatter', 'test.md')).toThrow('has no YAML frontmatter')
    expect(() => parseQuranSkill('---\ndescription: only desc\n---\nbody', 'test.md')).toThrow('has no name')
    expect(() => parseQuranSkill('---\nname: only-name\n---\nbody', 'test.md')).toThrow('has no description')
  })
})
