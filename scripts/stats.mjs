// Reads views, likes, replies, reposts and shares of one post, or of a profile's recent posts.
import fs from 'node:fs'
import { openThreads, goto, sleep, SITE } from './threads.mjs'

const argv = process.argv.slice(2)
const flag = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}
const target = argv.find((a, i) => !a.startsWith('--') && !['--limit', '--since', '--json'].includes(argv[i - 1]))
if (!target) {
  console.error('usage: node scripts/stats.mjs <post url> | @user [--limit 20] [--since DD/MM] [--json out.json]')
  process.exit(1)
}
const limit = Number(flag('--limit') || 20)
const since = flag('--since') && parseSince(flag('--since'))

// "1,1 mil" / "2 mi" / "1.2K" / "3M" / "142" -> number
function parseCount(text) {
  const m = String(text || '').replace(/\s/g, ' ').match(/([\d.,]+)\s*(mil|mi|k|m)?/i)
  if (!m) return 0
  const unit = { mil: 1e3, k: 1e3, mi: 1e6, m: 1e6 }[m[2]?.toLowerCase()] || 1
  const value = unit > 1 ? Number(m[1].replace(',', '.')) : Number(m[1].replace(/[.,]/g, ''))
  return Math.round(value * unit)
}

function parseSince(value) {
  const [d, mo, y] = value.split('/').map(Number)
  return new Date(y || new Date().getFullYear(), mo - 1, d)
}

// Runs in the page: the action bar icons carry an svg <title> (Like/Curtir...) next to their count.
function readPost() {
  const post = document.querySelector('[data-pressable-container=true]')
  const count = (re) => [...(post?.querySelectorAll('[role=button]') || [])].find((b) => re.test(b.querySelector('svg title')?.textContent || ''))?.innerText.trim() || '0'
  const views = document.body.innerText.match(/([\d.,]+(?:\s*(?:mil|mi|k|m))?)\s+(?:visualizaç|views?\b)/i)?.[1] || '0'
  const id = post?.querySelector('time[datetime]')?.closest('a')?.getAttribute('href')?.match(/\/post\/([^/?]+)/)?.[1] || ''
  const time = post?.querySelector('time[datetime]')?.getAttribute('datetime') || ''
  const text = (post?.innerText || '').split('\n').slice(2).join(' ').replace(/\s+/g, ' ').slice(0, 80)
  return { id, views, likes: count(/^(Curtir|Like|Descurtir|Unlike)$/), replies: count(/^(Responder|Reply)$/), reposts: count(/^(Repostar|Repost)$/), shares: count(/^(Compartilhar|Share)$/), time, text }
}

async function statsOf(url) {
  await goto(browser, url, 6000)
  let raw = await browser.evaluate(`(${readPost})()`)
  // The views counter loads a moment after the post.
  if (raw.views === '0') {
    await sleep(3000)
    raw = await browser.evaluate(`(${readPost})()`)
  }
  // A reply's page shows the root post first: different id means this url is a reply, not a post.
  const reply = raw.id && !url.includes('/post/' + raw.id)
  return { reply, url, time: raw.time, text: raw.text, views: parseCount(raw.views), likes: parseCount(raw.likes), replies: parseCount(raw.replies), reposts: parseCount(raw.reposts), shares: parseCount(raw.shares) }
}

async function profilePosts(user) {
  await goto(browser, `${SITE}/@${user}`, 7000)
  followers = await browser.evaluate(`document.body.innerText.match(/([\\d.,]+(?:\\s*(?:mil|mi|k|m))?)\\s+(?:seguidores|followers)/i)?.[1] || ''`)
  const found = new Map()
  for (let i = 0; i < 30 && found.size < limit * 2; i++) {
    const batch = await browser.evaluate(`[...document.querySelectorAll('a[href^="/@${user}/post/"] time[datetime]')].map((t) => [t.closest('a').getAttribute('href').split('?')[0], t.getAttribute('datetime')])`)
    for (const [href, at] of batch) found.set(href.replace(/\/media$/, ''), at)
    const oldest = Math.min(...[...found.values()].map(Date.parse))
    if (since && oldest < since.getTime()) break
    await browser.evaluate('window.scrollBy(0, 2500)')
    await sleep(1500)
  }
  // Pinned posts come first on the profile, so order by timestamp.
  return [...found].map(([href, at]) => ({ url: SITE + href, at: Date.parse(at) }))
    .filter((p) => !since || p.at >= since.getTime())
    .sort((a, b) => b.at - a.at)
    .slice(0, limit)
}

const browser = await openThreads()
const rows = []
let followers = ''
try {
  const urls = target.startsWith('@') ? (await profilePosts(target.slice(1))).map((p) => p.url) : [target]
  for (const url of urls) {
    const row = await statsOf(url)
    if (!row.reply || urls.length === 1) rows.push(row)
  }
} finally {
  await browser.close()
}

if (followers) console.log(`${target}: ${parseCount(followers)} followers`)
for (const r of rows) {
  const when = r.time ? new Date(r.time).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '?'
  console.log(`${when} | ${String(r.views).padStart(6)} views | ${r.likes} likes | ${r.replies} replies | ${r.reposts} reposts | ${r.shares} shares | ${r.text}`)
  console.log(`  ${r.url}`)
}
if (flag('--json')) fs.writeFileSync(flag('--json'), JSON.stringify(rows, null, 2))
