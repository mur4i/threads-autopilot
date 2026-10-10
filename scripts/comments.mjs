// Lists the replies under a post: author, age, likes and text, most liked first.
import { openThreads, goto, sleep } from './threads.mjs'

const argv = process.argv.slice(2)
const url = argv.find((a) => a.startsWith('http'))
const limitIdx = argv.indexOf('--limit')
const limit = limitIdx >= 0 ? Number(argv[limitIdx + 1]) : 30
if (!url) {
  console.error('usage: node scripts/comments.mjs <post url> [--limit 30]')
  process.exit(1)
}

// Runs in the page: every block after the first one is a reply.
function readReplies() {
  const blocks = [...document.querySelectorAll('[data-pressable-container=true]')].slice(1)
  return blocks.map((b) => {
    const author = b.querySelector('a[href^="/@"]')?.getAttribute('href')?.split('/')[1]?.slice(1) || ''
    const link = b.querySelector('time[datetime]')?.closest('a')?.getAttribute('href') || ''
    const likeBtn = [...b.querySelectorAll('[role=button]')].find((x) => /^(Curtir|Like|Descurtir|Unlike)$/.test(x.querySelector('svg title')?.textContent || ''))
    const lines = b.innerText.split('\n').map((l) => l.trim()).filter(Boolean)
    // Header is author + age; the tail is the numeric action counts.
    while (lines.length && /^[\d.,]+(\s*(mil|mi|k|m))?$/i.test(lines.at(-1))) lines.pop()
    const text = lines.slice(2).filter((l) => l !== '/' && !/^Fixado|^Pinned/.test(l)).join(' ')
    return { author, age: lines[1] || '', likes: likeBtn?.innerText.trim() || '0', text, link: link ? location.origin + link : '' }
  })
}

const browser = await openThreads()
let replies = []
try {
  await goto(browser, url, 6000)
  const seen = new Map()
  for (let i = 0; i < 12 && seen.size < limit; i++) {
    for (const r of await browser.evaluate(`(${readReplies})()`)) if (r.link) seen.set(r.link, r)
    await browser.evaluate('window.scrollBy(0, 2500)')
    await sleep(1500)
  }
  replies = [...seen.values()]
} finally {
  await browser.close()
}

const owner = url.match(/\/@([^/]+)\//)?.[1]
const num = (v) => Number(String(v).replace(/\D/g, '')) || 0
for (const r of replies.filter((r) => r.author !== owner).sort((a, b) => num(b.likes) - num(a.likes)).slice(0, limit)) {
  console.log(`@${r.author} | ${r.age} | ${r.likes} likes | ${r.text}`)
  console.log(`  ${r.link}`)
}
