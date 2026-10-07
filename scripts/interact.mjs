// Likes and/or reposts a Threads post (the main post on its page); skips what is already done.
import path from 'node:path'
import { openThreads, isLoggedIn, goto, clickElement, sleep, SITE, OUT } from './threads.mjs'

const argv = process.argv.slice(2)
const url = argv.find((a) => !a.startsWith('--'))
const like = argv.includes('--like')
const repost = argv.includes('--repost')
if (!url || (!like && !repost)) {
  console.error('usage: node scripts/interact.mjs <post url> [--like] [--repost]')
  process.exit(1)
}

const post = `document.querySelector('[data-pressable-container=true]')`
// Action icons are named by the svg <title> (aria-label on older layouts).
const name = (s) => `(${s}.querySelector('title')?.textContent || ${s}.getAttribute('aria-label') || '')`
const icon = (re) => `[...(${post}).querySelectorAll('svg')].find((s) => ${re}.test(${name('s')}))`
const label = (re) => `(() => { const s = ${icon(re)}; return s ? ${name('s')} : '' })()`
const browser = await openThreads()
try {
  await goto(browser, SITE, 3000)
  if (!(await isLoggedIn(browser))) throw new Error('LOGGED OUT: run node scripts/login.mjs')
  await goto(browser, url, 5000)
  console.log('post: ' + (await browser.evaluate(`(${post})?.innerText.slice(0, 200) || ''`)).replace(/\s+/g, ' '))

  if (like) {
    if (/^(Descurtir|Unlike)$/.test(await browser.evaluate(label('/^(Descurtir|Unlike)$/')))) console.log('like: already done')
    else {
      if (!(await clickElement(browser, `${icon('/^(Curtir|Like)$/')}?.closest('[role=button]')`))) throw new Error('like button not found')
      await sleep(1500)
      console.log('like: ' + ((await browser.evaluate(label('/^(Descurtir|Unlike)$/'))) ? 'OK' : 'not confirmed'))
    }
  }

  if (repost) {
    const reposted = /Remover|Remove|Desfazer|Undo/i
    if (!(await clickElement(browser, `${icon('/^(Repostar|Repost)$/')}?.closest('[role=button]')`))) throw new Error('repost button not found')
    await sleep(1200)
    // The icon opens a menu: "Repost", or "Remove" when it was already reposted.
    const items = await browser.evaluate(`[...document.querySelectorAll('[role=menu] [role=button], [role=menuitem], [role=dialog] [role=button]')].map((b) => b.innerText.trim()).filter(Boolean)`)
    if (items.some((t) => reposted.test(t))) {
      await browser.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
      console.log('repost: already done')
    } else {
      const item = `[...document.querySelectorAll('[role=menu] [role=button], [role=menuitem], [role=dialog] [role=button]')].find((b) => /^(Repostar|Repost)$/i.test(b.innerText.trim().split('\\n')[0]))`
      if (!(await clickElement(browser, item))) throw new Error('Repost option not found in the menu: ' + items.join(' / '))
      await sleep(2000)
      console.log('repost: OK')
    }
  }
  console.log('screenshot: ' + (await browser.screenshot(path.join(OUT, 'interact.png'))))
} finally {
  await browser.close()
}
