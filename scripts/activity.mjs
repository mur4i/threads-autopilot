// Lists the latest replies people left on the account's posts (Activity > Replies), newest first.
import fs from 'node:fs'
import { openThreads, isLoggedIn, goto, sleep, SITE } from './threads.mjs'

const argv = process.argv.slice(2)
const flag = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}
const limit = Number(flag('--limit') || 30)

// Runs in the page: leaf text spans are author, age, the post replied to, then the reply itself.
function readReplies() {
  return [...document.querySelectorAll('[data-pressable-container=true]')].map((b) => {
    const spans = [...b.querySelectorAll('span[dir=auto]')].filter((s) => !s.querySelector('span[dir=auto]')).map((s) => s.innerText.trim())
    const link = [...b.querySelectorAll('a[href*="/post/"]')].map((a) => a.getAttribute('href')).find((h) => /^\/@[^/]+\/post\/[^/]+$/.test(h)) || ''
    return { author: spans[0] || '', time: b.querySelector('time[datetime]')?.getAttribute('datetime') || '', post: spans[2] || '', text: spans[3] || '', link: link ? location.origin + link : '' }
  })
}

const browser = await openThreads()
let rows = []
try {
  await goto(browser, SITE, 3000)
  if (!(await isLoggedIn(browser))) throw new Error('LOGGED OUT: run node scripts/login.mjs')
  await goto(browser, `${SITE}/activity/replies`, 6000)
  const seen = new Map()
  for (let i = 0; i < 10 && seen.size < limit; i++) {
    for (const r of await browser.evaluate(`(${readReplies})()`)) if (r.link) seen.set(r.link, r)
    await browser.evaluate('window.scrollBy(0, 2500)')
    await sleep(1500)
  }
  rows = [...seen.values()].sort((a, b) => Date.parse(b.time) - Date.parse(a.time)).slice(0, limit)
} finally {
  await browser.close()
}

for (const r of rows) {
  const when = r.time ? new Date(r.time).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '?'
  console.log(`${when} @${r.author} | ${r.text} | on: ${r.post.slice(0, 60)}`)
  console.log(`  ${r.link}`)
}
if (flag('--json')) fs.writeFileSync(flag('--json'), JSON.stringify(rows, null, 2))
