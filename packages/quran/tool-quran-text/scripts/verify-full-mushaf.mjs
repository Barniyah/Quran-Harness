/**
 * Full-mushaf cross-verification: Tanzil pinned artifact × Quran.com API v4.
 * Fetches per chapter (114 requests) and compares all 6236 verses after the
 * documented normalization (NFC, strip tatweel, strip leading Basmalah on
 * first verses, whitespace). Writes a JSON report with per-verse verdicts.
 *
 * Run: node packages/quran/tool-quran-text/scripts/verify-full-mushaf.mjs
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const MARKS_RUN = /[ؐ-ًؚ-ٰٟۖ-ۭ]+/g
const BASMALAH_SKELETON = ['بسم', 'الله', 'الرحمن', 'الرحيم']
const stripLeadingBasmalahWords = n => {
  const skeleton = w => w.replace(MARKS_RUN, '').replace(/[ٱأإآ]/g, 'ا')
  const words = n.split(' ')
  if (words.length > 4 && BASMALAH_SKELETON.every((w, i) => skeleton(words[i]) === w)) return words.slice(4).join(' ')
  return n
}
const norm = (t, strip) => {
  let n = t.normalize('NFC').replace(/[ـ۞۩]/g, '').replace(/\s+/g, ' ').trim()
  n = n.replace(MARKS_RUN, run => [...run].sort().join(''))
  if (strip) n = stripLeadingBasmalahWords(n)
  return n
}

const tanzil = new Map()
const raw = readFileSync(join(here, '../data/quran-uthmani.txt'), 'utf8')
for (const line of raw.split('\n')) {
  if (!line) continue
  const s1 = line.indexOf('|'), s2 = line.indexOf('|', s1 + 1)
  tanzil.set(`${line.slice(0, s1)}:${line.slice(s1 + 1, s2)}`, line.slice(s2 + 1).replace(/\r$/, ''))
}

const report = { startedAt: new Date().toISOString(), verses: 0, matched: 0, mismatches: [], errors: [] }
for (let chapter = 1; chapter <= 114; chapter++) {
  try {
    const res = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${chapter}&per_page=300`)
    const body = await res.json()
    for (const v of body.verses) {
      const key = v.verse_key
      const [s, a] = key.split(':').map(Number)
      const local = tanzil.get(key)
      report.verses++
      if (local === undefined) { report.mismatches.push({ key, reason: 'missing-in-tanzil' }); continue }
      const strip = a === 1 && s !== 1
      if (norm(local, strip) === norm(v.text_uthmani, strip)) report.matched++
      else report.mismatches.push({ key, localHash: createHash('sha256').update(norm(local, strip)).digest('hex').slice(0, 12), remoteHash: createHash('sha256').update(norm(v.text_uthmani, strip)).digest('hex').slice(0, 12) })
    }
    if (chapter % 20 === 0) console.log(`chapter ${chapter}/114 — matched ${report.matched}/${report.verses}`)
  } catch (e) {
    report.errors.push({ chapter, error: String(e) })
  }
}
report.finishedAt = new Date().toISOString()
writeFileSync(join(here, 'verify-full-mushaf-report.json'), JSON.stringify(report, null, 2))
console.log(`\nDONE: ${report.matched}/${report.verses} matched, ${report.mismatches.length} mismatches, ${report.errors.length} errors`)
if (report.mismatches.length) console.log('first mismatches:', report.mismatches.slice(0, 10))
