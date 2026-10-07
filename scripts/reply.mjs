// Replies to a Threads post (URL, or @user for their latest non-pinned post); --dry stops before sending.
import fs from 'node:fs'
import path from 'node:path'
import { openThreads, isLoggedIn, goto, clickElement, checkLength, sleep, SITE, OUT } from './threads.mjs'

const argv = process.argv.slice(2)
const dry = argv.includes('--dry')
const fileIdx = argv.indexOf('--file')
const [target, inlineText] = argv.filter((a, i) => !a.startsWith('--') && (fileIdx < 0 || i !== fileIdx + 1))
const text = fileIdx >= 0 ? fs.readFileSync(argv[fileIdx + 1], 'utf8').trim() : inlineText
if (!target || !text) {
  console.error('usage: node scripts/reply.mjs <post url | @user> "text" [--dry] | <target> --file reply.txt [--dry]')
  process.exit(1)
}
checkLength(text)

const box = `document.querySelector('[contenteditable=true][role=textbox]') || document.querySelector('[contenteditable=true]')`
fs.mkdirSync(OUT, { recursive: true })
const browser = await openThreads()
try {
  await run()
} finally {
  await browser.close()
}

async function latestPost(user) {
  await goto(browser, `${SITE}/@${user}`, 6000)
  // Pinned posts come first on the profile, so pick by the newest timestamp link instead of order.
  return browser.evaluate(`(() => {
    const stamps = [...document.querySelectorAll('a[href^="/@${user}/post/"] time[datetime]')]
      .map((t) => ({ href: t.closest('a').getAttribute('href'), at: Date.parse(t.getAttribute('datetime')) }))
      .sort((a, b) => b.at - a.at)
    return stamps[0] ? location.origin + stamps[0].href : ''
  })()`)
}

async function run() {
  await goto(browser, SITE, 3000)
  if (!(await isLoggedIn(browser))) throw new Error('LOGGED OUT: run node scripts/login.mjs')

  const url = target.startsWith('@') ? await latestPost(target.slice(1)) : target
  if (!url) throw new Error('no post found for ' + target)
  console.log('post: ' + url)
  await goto(browser, url, 5000)
  console.log('post text: ' + (await browser.evaluate(`document.querySelector('[data-pressable-container=true]')?.innerText.slice(0, 300) || ''`)).replace(/\s+/g, ' '))

  if (!(await clickElement(browser, box))) throw new Error('reply box not found')
  await sleep(800)
  await browser.send('Input.insertText', { text })
  await sleep(1500)
  const preview = await browser.screenshot(path.join(OUT, 'reply-preview.png'))
  console.log('draft ready: ' + preview)
  if (dry) return

  // The send control is an arrow icon whose svg is labelled "Reply", next to the box.
  const button = `(() => { let el = ${box}; for (let i = 0; i < 8 && el; i++) { el = el.parentElement; const b = [...el.querySelectorAll('[role=button], button')].find((b) => /^(Reply|Responder)$/i.test(b.querySelector('svg')?.getAttribute('aria-label') || b.getAttribute('aria-label') || '')); if (b) return b } })()`
  const posted = `[...document.querySelectorAll('[data-pressable-container=true]')].some((p) => !p.querySelector('[contenteditable=true]') && p.innerText.includes(${JSON.stringify(text.slice(0, 40))}))`
  if (!(await clickElement(browser, button))) throw new Error('send button not found, see ' + preview)

  let ok = false
  for (let i = 0; i < 20 && !ok; i++) {
    await sleep(1000)
    // The "Posting..." toast means the upload is still running; closing Chrome then can lose the reply.
    ok = (await browser.evaluate(`!(${box})?.innerText.trim() && !/Posting|Postando/.test(document.body.innerText)`)) && (await browser.evaluate(posted))
  }
  const after = await browser.screenshot(path.join(OUT, 'reply-after.png'))
  if (!ok) throw new Error('could not confirm the reply was posted, see ' + after)
  console.log('REPLIED ' + url + ' | ' + after)
}
