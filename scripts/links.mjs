// node links.mjs @user [newUrl] [--save]: shows the profile links; with newUrl replaces the first one.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { openThreads, goto, sleep, SITE } from './threads.mjs'
const [userArg, url] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const save = process.argv.includes('--save')
const profile = `${SITE}/@${userArg.replace('@', '')}`
const b = await openThreads()
const shot = async (f) => { const { data } = await b.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(f, Buffer.from(data, 'base64')) }
const dialog = () => b.evaluate(`[...document.querySelectorAll('[role=dialog]')].map((d) => d.innerText).join(' || ').split(String.fromCharCode(10)).join(' / ').slice(0, 600)`)
// Threads ignores synthetic .click() on some rows, so every click is a real mouse event at the element's center.
const mouse = async (finder) => {
  const r = await b.evaluate(`(() => { const e = (${finder})(); if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2 } })()`)
  if (!r) return false
  for (const type of ['mousePressed', 'mouseReleased']) await b.send('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 })
  return true
}
const byText = (re) => `() => [...document.querySelectorAll('[role=dialog] *, [role=button]')].filter((x) => ${re}.test(x.innerText?.trim() || '')).pop()`
const byLabel = (re) => `() => [...document.querySelectorAll('[role=dialog] [aria-label]')].filter((x) => ${re}.test(x.getAttribute('aria-label'))).pop()`
try {
  await goto(b, profile, 7000)
  await mouse(`() => [...document.querySelectorAll('[role=button], button')].find((x) => /^(Editar perfil|Edit profile)$/.test(x.innerText?.trim()))`); await sleep(3000)
  await mouse(`() => [...document.querySelectorAll('[role=dialog] [role=button]')].find((x) => /^Links?/.test(x.innerText) && x.innerText.length < 300)`); await sleep(2500)
  console.log('links:', await dialog())
  if (url) {
    await mouse(`() => [...document.querySelectorAll('[role=dialog] *')].filter((x) => /https?:/.test(x.innerText) && x.children.length === 0).pop()`); await sleep(2500)
    const box = await b.evaluate(`(() => { const e = [...document.querySelectorAll('[role=dialog] input')].find((x) => /http/.test(x.value)); if (!e) return null; e.focus(); e.select(); return e.value })()`)
    console.log('url box:', box)
    if (!box) process.exit(1)
    await b.send('Input.insertText', { text: url }); await sleep(800)
    console.log('now:', await b.evaluate(`document.activeElement.value`))
    if (save) {
      console.log('link done:', await mouse(byText('/^(Concluir|Done)$/'))); await sleep(2500)
      console.log('  ->', await dialog())
      console.log('back:', await mouse(byLabel('/^(Voltar|Back)$/'))); await sleep(2500)
      console.log('  ->', (await dialog()).slice(0, 160))
      console.log('profile done:', await mouse(byText('/^(Concluir|Done)$/'))); await sleep(5000)
      console.log('  ->', (await dialog()).slice(0, 160))
      await goto(b, profile, 6000)
      console.log('profile link:', await b.evaluate(`(document.body.innerText.match(/[a-z0-9-]+\\.vercel\\.app[^\\s]*/i) || [])[0]`))
      await shot(path.join(os.tmpdir(), 'threads-autopilot', 'links-after.png'))
    }
  }
} finally { await b.close() }
