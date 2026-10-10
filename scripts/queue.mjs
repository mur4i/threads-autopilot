// Posts several text files one after another, with a random gap between them and an optional start time.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { sleep } from './threads.mjs'

const argv = process.argv.slice(2)
const flag = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}
const args = argv.filter((a, i) => !a.startsWith('--') && !['--gap', '--start'].includes(argv[i - 1]))
// A single folder argument means every .txt in it, in natural order.
const files = args.length === 1 && fs.statSync(args[0]).isDirectory()
  ? fs.readdirSync(args[0]).filter((f) => f.endsWith('.txt')).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((f) => path.join(args[0], f))
  : args
if (!files.length) {
  console.error('usage: node scripts/queue.mjs 1.txt 2.txt ... | <folder> [--gap 5-15] [--start HH:MM]')
  process.exit(1)
}
const [minGap, maxGap] = (flag('--gap') || '5-15').split('-').map(Number)
const stamp = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const post = path.join(path.dirname(fileURLToPath(import.meta.url)), 'post.mjs')

for (const file of files) {
  const n = [...fs.readFileSync(file, 'utf8').trim()].length
  if (n > 500) throw new Error(`${file} has ${n} characters, Threads allows 500`)
}

// "0830.txt" or "3-2005.txt": that file goes out at that local time (plus a few random minutes).
const timeOf = (file) => {
  const m = path.basename(file).match(/(?:^|-)([01]\d|2[0-3])([0-5]\d)(?:-|\.txt$)/)
  if (!m) return 0
  const at = new Date()
  at.setHours(+m[1], +m[2], 0, 0)
  return at.getTime() + Math.random() * 7 * 60e3
}

if (flag('--start')) {
  const [h, m] = flag('--start').split(':').map(Number)
  const at = new Date()
  at.setHours(h, m, 0, 0)
  if (at < new Date()) at.setDate(at.getDate() + 1)
  // A few random minutes so the first post is not on the dot either.
  const wait = at - new Date() + Math.random() * 7 * 60e3
  console.log(`[${stamp()}] first post in ${Math.round(wait / 60e3)} min`)
  await sleep(wait)
}

let last = 0
for (const file of files) {
  // A late or untimed file still keeps a human gap from the previous post, never a burst.
  const gapEnd = last ? last + (minGap + Math.random() * (maxGap - minGap)) * 60e3 : 0
  const wait = Math.max(timeOf(file), gapEnd) - Date.now()
  if (wait > 0) {
    console.log(`[${stamp()}] next in ${Math.round(wait / 60e3)} min`)
    await sleep(wait)
  }
  // Claim the file by moving it into done/: a second runner on the same folder (or a restart) skips it.
  const doneDir = path.join(path.dirname(file), 'done')
  const claimed = path.join(doneDir, path.basename(file))
  try {
    fs.mkdirSync(doneDir, { recursive: true })
    fs.renameSync(file, claimed)
  } catch {
    console.log(`[${stamp()}] ${path.basename(file)} skipped, already taken`)
    continue
  }
  for (let attempt = 1; attempt <= 2; attempt++) {
    const r = spawnSync(process.execPath, [post, '--file', claimed], { encoding: 'utf8' })
    const out = `${r.stdout}\n${r.stderr}`
    const done = out.match(/POSTED.*/)?.[0]
    if (done) {
      console.log(`[${stamp()}] ${path.basename(file)} ${done}`)
      break
    }
    // Only a browser that never opened is safe to retry; any later failure could mean it was posted.
    const retry = attempt === 1 && /Chrome did not answer/.test(out)
    console.log(`[${stamp()}] ${path.basename(file)} FAILED${retry ? ', retrying' : ''}: ${out.trim().split('\n').filter((l) => /rror|LOGGED OUT|did not/.test(l))[0] || out.trim().split('\n').at(-1)}`)
    if (!retry) {
      fs.renameSync(claimed, claimed + '.failed')
      break
    }
    await sleep(30e3)
  }
  last = Date.now()
}
