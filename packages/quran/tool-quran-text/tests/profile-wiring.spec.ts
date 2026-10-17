/**
 * Profile wiring test: boot the real Web profile with the Quran Harness patch
 * and prove both Quran tools register in the live tool registry.
 *
 * An observer plugin (generated into a temp dir) runs after the Quran plugins
 * in the same patch and records `ctx.tools.get(...)` presence to a JSON file,
 * which the test then asserts on.
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

/** The repo runtime rejects Kimi's Electron-flavoured Node; use the standalone install for child processes. */
const childNode = process.versions.electron ? 'C:\\Program Files\\nodejs\\node.exe' : process.execPath

const OBSERVER_SOURCE = `import { writeFileSync } from 'node:fs'
export const name = 'quran-observer'
export const inject = ['tools']
export function apply(ctx, config) {
  // Plugin activation is asynchronous; poll until both tools appear (or a cap),
  // writing the first snapshot that sees them and a final one either way.
  const snapshot = () => ({
    quran_get_verse: !!ctx.tools.get('quran_get_verse'),
    quran_get_metadata: !!ctx.tools.get('quran_get_metadata'),
    quranTools: ctx.tools.schemas().map(s => s.name).filter(n => n.startsWith('quran')),
  })
  let tries = 0
  const tick = () => {
    const s = snapshot()
    tries++
    if ((s.quran_get_verse && s.quran_get_metadata) || tries >= 15) {
      writeFileSync(config.out, JSON.stringify(s))
      return
    }
    setTimeout(tick, 2000)
  }
  setTimeout(tick, 2000)
}
`

it('web profile with quran patch registers quran_get_verse and quran_get_metadata', async (test) => {
  if (!existsSync(binJs)) {
    console.warn('apps/cli/lib/bin.js not built — run pnpm run build first; skipping')
    return
  }
  const root = await mkdtemp(join(tmpdir(), 'quran-profile-'))
  test.onTestFinished(() => rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 500 }))

  const observerOut = join(root, 'observer.json')
  const auditLog = join(root, 'evidence-audit.jsonl')
  const observerPath = join(root, 'quran-observer.mjs')
  await writeFile(observerPath, OBSERVER_SOURCE)

  const patchPath = join(root, 'quran.patch.yml')
  const pluginUrl = (pkg: string) => pathToFileURL(join(repo, 'packages/quran', pkg, 'lib/index.js')).href
  await writeFile(patchPath, `- insert:
    - id: tool-quran-text
      name: '${pluginUrl('tool-quran-text')}'
      config:
        auditLogPath: '${auditLog.replace(/\\/g, '/')}'
    - id: tool-quran-metadata
      name: '${pluginUrl('tool-quran-metadata')}'
      config:
        auditLogPath: '${auditLog.replace(/\\/g, '/')}'
    - id: quran-observer
      name: '${pathToFileURL(observerPath).href}'
      config:
        out: '${observerOut.replace(/\\/g, '/')}'
`)

  const child = spawn(childNode, [binJs, '--profile', 'web', '--patch', patchPath, '--port', '0', '--no-open'], {
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

  const deadline = Date.now() + 90_000
  while (Date.now() < deadline && !existsSync(observerOut) && child.exitCode === null) {
    await new Promise(r => setTimeout(r, 500))
  }
  if (!existsSync(observerOut)) {
    throw new Error(`observer never wrote its report; child output tail:\n${output.slice(-4000)}`)
  }

  const report = JSON.parse(await readFile(observerOut, 'utf8'))
  const debug = () => `\nreport: ${JSON.stringify(report)}\nchild output tail:\n${output.slice(-3000)}`
  expect(report.quran_get_verse, `quran_get_verse must be registered${debug()}`).toBe(true)
  expect(report.quran_get_metadata, `quran_get_metadata must be registered${debug()}`).toBe(true)
}, 120_000)
