// Deletes one of your own Threads posts (the main post on its page). Irreversible.
import path from 'node:path'
import { openThreads, isLoggedIn, goto, clickElement, sleep, SITE, OUT } from './threads.mjs'

const argv = process.argv.slice(2)
const url = argv.find((a) => !a.startsWith('--'))
const dry = argv.includes('--dry')
if (!url) {
  console.error('usage: node scripts/delete.mjs <post url> [--dry]')
  process.exit(1)
}

const post = `document.querySelector('[data-pressable-container=true]')`
const name = (s) => `(${s}.querySelector('title')?.textContent || ${s}.getAttribute('aria-label') || '')`
const more = `[...(${post}).querySelectorAll('svg')].find((s) => /^(Mais|More)$/.test(${name('s')}))?.closest('[role=button]')`
const items = `[...document.querySelectorAll('[role=menu] *, [role=dialog] *')]`
const byText = (re) => `${items}.filter((b) => ${re}.test((b.innerText || '').trim())).pop()`
// Mouse events do not trigger these menu items; a DOM click on the item does.
const jsClick = (finder) => `(() => { const e = ${finder}; if (!e) return false; (e.closest('[role=menuitem],[role=button]') || e).click(); return true })()`
const browser = await openThreads()
try {
  await goto(browser, SITE, 3000)
  if (!(await isLoggedIn(browser))) throw new Error('LOGGED OUT: run node scripts/login.mjs')
  await goto(browser, url, 5000)
  console.log('post: ' + (await browser.evaluate(`(${post})?.innerText.slice(0, 200) || ''`)).replace(/\s+/g, ' '))
  if (!(await clickElement(browser, more))) throw new Error('"More" button not found')
  await sleep(1200)
  if (!(await browser.evaluate(jsClick(byText('/^(Excluir|Apagar|Delete)$/i'))))) {
    const seen = await browser.evaluate(`${items}.filter((b) => !b.children.length).map((b) => (b.innerText || '').trim()).filter(Boolean).join(' / ')`)
    throw new Error('Delete option not found in the menu: ' + seen)
  }
  await sleep(1200)
  if (dry) {
    console.log('DRY: confirm dialog open, not deleted | ' + (await browser.screenshot(path.join(OUT, 'delete.png'))))
  } else {
    if (!(await browser.evaluate(jsClick(`[...document.querySelectorAll('[role=dialog] *')].filter((b) => /^(Excluir|Delete)$/i.test((b.innerText || '').trim())).pop()`)))) throw new Error('confirm button not found')
    await sleep(3000)
    await goto(browser, url, 4000)
    // A deleted post's URL redirects to the profile.
    const gone = await browser.evaluate(`!location.pathname.includes('/post/') || /não está disponível|isn't available|not available/i.test(document.body.innerText)`)
    console.log((gone ? 'DELETED ' : 'NOT CONFIRMED ') + url + ' | ' + (await browser.screenshot(path.join(OUT, 'delete.png'))))
  }
} finally {
  await browser.close()
}
