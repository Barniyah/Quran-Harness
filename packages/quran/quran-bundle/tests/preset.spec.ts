/**
 * Quran preset test: boot the real Web profile with the quran-bundle patch and
 * prove the `quran` preset registers in the preset registry and resolves as
 * the deployment default.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { expect, it } from 'vitest'

const repo = fileURLToPath(new URL('../../../..', import.meta.url))
const binJs = join(repo, 'apps/cli/lib/bin.js')

/** The repo runtime rejects Kimi's Electron-flavoured Node; use the standalone install when running under Electron. */
const winNode = 'C:\\Program Files\\nodejs\\node.exe'
const childNode = process.versions.electron && existsSync(winNode) ? winNode : process.execPath

const OBSERVER_SOURCE = `import { writeFileSync } from 'node:fs'
export const name = 'quran-preset-observer'
export const inject = ['agentPresets']
export function apply(ctx, config) {
  const snapshot = async () => {
    const presets = await ctx.agentPresets.list()
    const resolved = await ctx.agentPresets.resolve()
    const doc = presets.some(p => p.id === 'quran') ? await ctx.agentPresets.readDocument('quran') : { content: '' }
    return { ids: presets.map(p => p.id), defaultId: resolved.id, broken: resolved.broken, content: doc.content }
  }
  let tries = 0
  const tick = async () => {
    tries++
    try {
      const s = await snapshot()
      if (s.ids.includes('quran') || tries >= 15) {
        writeFileSync(config.out, JSON.stringify(s))
        return
      }
    } catch { /* registry not ready yet */ }
    setTimeout(tick, 2000)
  }
  setTimeout(tick, 2000)
}
`

it('web profile with quran bundle registers the quran preset as default', async (test) => {
  if (!existsSync(binJs)) {
    console.warn('apps/cli/lib/bin.js not built — run pnpm run build first; skipping')
    return
  }
  const root = await mkdtemp(join(tmpdir(), 'quran-preset-'))
  test.onTestFinished(() => rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 500 }))

  const observerOut = join(root, 'observer.json')
  const observerPath = join(root, 'observer.mjs')
  await writeFile(observerPath, OBSERVER_SOURCE)

  // Bundle patch + observer overlay in one patch list.
  const bundlePatch = join(repo, 'packages/quran/quran-bundle/cordis.patch.yml')
  const patchPath = join(root, 'observer.patch.yml')
  await writeFile(patchPath, `- insert:
    - id: quran-preset-observer
      name: '${pathToFileURL(observerPath).href}'
      config:
        out: '${observerOut.replace(/\\/g, '/')}'
`)

  const child = spawn(childNode, [
    binJs, '--profile', 'web',
    '--patch', bundlePatch, '--patch', patchPath,
    '--port', '0', '--no-open',
  ], {
    cwd: root,
    env: {
      ...process.env,
      DSH_HOME: join(root, 'home'),
      DSH_AGENTS_HOME: join(root, 'agents'),
      DSH_TELEMETRY_DISABLED: '1',
      DEEPSEEK_API_KEY: 'keyless-no-model-calls',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  for (const stream of [child.stdout, child.stderr]) {
    stream!.on('data', (d) => { output = (output + String(d)).slice(-20_000) })
  }
  const childDone = new Promise<void>(resolve => child.once('close', () => resolve()))
  test.onTestFinished(async () => { if (child.exitCode === null) child.kill('SIGTERM'); await childDone })

  const deadline = Date.now() + 120_000
  while (Date.now() < deadline && !existsSync(observerOut) && child.exitCode === null) {
    await new Promise(r => setTimeout(r, 500))
  }
  if (!existsSync(observerOut)) {
    throw new Error(`observer never wrote its report; child output tail:\n${output.slice(-4000)}`)
  }

  const report = JSON.parse(await readFile(observerOut, 'utf8'))
  expect(report.ids, `preset ids (tail: ${output.slice(-2000)})`).toContain('quran')
  expect(report.defaultId, 'quran must be the default preset').toBe('quran')
  expect(report.broken, 'quran preset must activate all child plugins without error').toBeUndefined()
  expect(report.content, 'quran preset must include skill-quran').toContain('skill-quran')
}, 150_000)
