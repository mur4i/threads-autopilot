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
const files = argv.filter((a, i) => !a.startsWith('--') && !['--gap', '--start'].includes(argv[i - 1]))
if (!files.length) {
  console.error('usage: node scripts/queue.mjs 1.txt 2.txt ... [--gap 5-15] [--start HH:MM]')
  process.exit(1)
}
const [minGap, maxGap] = (flag('--gap') || '5-15').split('-').map(Number)
const stamp = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const post = path.join(path.dirname(fileURLToPath(import.meta.url)), 'post.mjs')

for (const file of files) {
  const n = [...fs.readFileSync(file, 'utf8').trim()].length
  if (n > 500) throw new Error(`${file} has ${n} characters, Threads allows 500`)
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

for (const [i, file] of files.entries()) {
  if (i > 0) {
    const gap = (minGap + Math.random() * (maxGap - minGap)) * 60e3
    console.log(`[${stamp()}] next in ${Math.round(gap / 60e3)} min`)
    await sleep(gap)
  }
  for (let attempt = 1; attempt <= 2; attempt++) {
    const r = spawnSync(process.execPath, [post, '--file', file], { encoding: 'utf8' })
    const out = `${r.stdout}\n${r.stderr}`
    const done = out.match(/POSTED.*/)?.[0]
    if (done) {
      console.log(`[${stamp()}] ${path.basename(file)} ${done}`)
      break
    }
    // Only a browser that never opened is safe to retry; any later failure could mean it was posted.
    const retry = attempt === 1 && /Chrome did not answer/.test(out)
    console.log(`[${stamp()}] ${path.basename(file)} FAILED${retry ? ', retrying' : ''}: ${out.trim().split('\n').filter((l) => /rror|LOGGED OUT|did not/.test(l))[0] || out.trim().split('\n').at(-1)}`)
    if (!retry) break
    await sleep(30e3)
  }
}
