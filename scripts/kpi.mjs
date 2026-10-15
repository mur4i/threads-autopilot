// Collects a profile's post stats and follower count into a kept history, and exports both accounts' rows for the dashboard.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const argv = process.argv.slice(2)
const flag = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined)
const user = argv.find((a) => a.startsWith('@'))
const DIR = process.env.KPI_DIR || path.join(os.homedir(), '.config', 'threads-autopilot', 'kpi')
const out = path.resolve(flag('--out') || DIR)
const days = Number(flag('--days') || 7)
fs.mkdirSync(DIR, { recursive: true })

const day = (d) => new Date(d).toLocaleDateString('sv-SE')

// Manual labels win (formats.json: {"<post url>": "psicologia"}); otherwise guessed from size and media.
const overrides = fs.existsSync(path.join(DIR, 'formats.json')) ? JSON.parse(fs.readFileSync(path.join(DIR, 'formats.json'), 'utf8')) : {}
function format(row) {
  if (overrides[row.url]) return overrides[row.url]
  if (row.images > 0) return 'imagem'
  if (row.chars && row.chars < 260) return 'frase'
  // Only the first 80 characters are kept, so a late "eu" is missed; formats.json fixes those.
  return /\b(eu|meu|minha|me|comigo)\b/i.test(row.text) ? 'história 1ª pessoa' : 'história 3ª pessoa'
}

if (user) {
  const since = new Date(Date.now() - days * 864e5).toLocaleDateString('pt-BR').slice(0, 5)
  const tmp = path.join(os.tmpdir(), `kpi-${user.slice(1)}.json`)
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'stats.mjs')
  const stdout = execFileSync(process.execPath, [script, user, '--since', since, '--limit', flag('--limit') || '80', '--json', tmp], { encoding: 'utf8', maxBuffer: 1 << 26 })
  const followers = Number(stdout.match(/: (\d+) followers/)?.[1] || 0)
  const rows = JSON.parse(fs.readFileSync(tmp, 'utf8')).filter((r) => !r.reply && r.time)

  const file = path.join(DIR, user.slice(1) + '.json')
  const hist = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { followers: {}, posts: {} }
  // Zero means the profile page did not load the count, not that everyone left.
  if (followers) hist.followers[day(Date.now())] = followers
  const checked = new Date().toISOString()
  for (const r of rows) hist.posts[r.url] = { ...hist.posts[r.url], ...r, checked }
  fs.writeFileSync(file, JSON.stringify(hist, null, 1))
  console.log(`${user}: ${followers} followers, ${rows.length} posts updated`)
}

const posts = []
const followers = []
for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'formats.json' && !['posts.json', 'followers.json'].includes(f))) {
  const account = '@' + f.slice(0, -5)
  const hist = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
  for (const [d, n] of Object.entries(hist.followers)) followers.push({ account, day: d, followers: n })
  for (const r of Object.values(hist.posts)) {
    const at = new Date(r.time)
    posts.push({ account, url: r.url, posted: r.time, day: day(at), hour: at.getHours(), format: format(r), text: r.text, views: r.views, likes: r.likes, replies: r.replies, reposts: r.reposts, shares: r.shares, checked: r.checked })
  }
}
posts.sort((a, b) => b.posted.localeCompare(a.posted))
followers.sort((a, b) => a.account.localeCompare(b.account) || a.day.localeCompare(b.day))
fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, 'posts.json'), JSON.stringify(posts))
fs.writeFileSync(path.join(out, 'followers.json'), JSON.stringify(followers))
console.log(`EXPORTED ${posts.length} posts, ${followers.length} follower days -> ${out}`)
