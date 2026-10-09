// Posts on Threads through the composer intent (text, optional image); --dry stops before clicking Post.
import fs from 'node:fs'
import path from 'node:path'
import { openThreads, isLoggedIn, goto, clickElement, checkLength, sleep, SITE, OUT } from './threads.mjs'

const argv = process.argv.slice(2)
const flag = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}
const dry = argv.includes('--dry')
const file = flag('--file')
const image = flag('--image') && path.resolve(flag('--image'))
const values = new Set([file, flag('--image'), flag('--schedule')])
const text = file ? fs.readFileSync(file, 'utf8').trim() : argv.find((a) => !a.startsWith('--') && !values.has(a))
if (!text) {
  console.error('usage: node scripts/post.mjs "text" | --file post.txt  [--image photo.jpg] [--schedule "DD/MM HH:MM"] [--dry]')
  process.exit(1)
}
const when = flag('--schedule') && parseWhen(flag('--schedule'))
if (image && !fs.existsSync(image)) {
  console.error('image not found: ' + image)
  process.exit(1)
}
checkLength(text)

fs.mkdirSync(OUT, { recursive: true })
const dialog = `[...document.querySelectorAll('[role=dialog]')].find((d) => d.querySelector('[contenteditable=true]'))`
const browser = await openThreads()
try {
  await run()
} finally {
  await browser.close()
}

async function run() {
  await goto(browser, SITE, 3000)
  if (!(await isLoggedIn(browser))) throw new Error('LOGGED OUT: run node scripts/login.mjs')

  await goto(browser, `${SITE}/intent/post?text=${encodeURIComponent(text)}`, 3000)
  let ready = false
  for (let i = 0; i < 20 && !ready; i++) {
    ready = await browser.evaluate(`!!(${dialog})`)
    if (!ready) await sleep(750)
  }
  if (ready && image) await attachImage()
  if (ready && when) await pickSchedule()
  const preview = await browser.screenshot(path.join(OUT, 'preview.png'))
  if (!ready) throw new Error('composer did not open, see ' + preview)
  console.log('draft ready: ' + preview)
  if (dry) return

  // With a schedule set, the composer's main button reads "Programar" / "Schedule" instead of "Post".
  const button = `[...(${dialog}).querySelectorAll('[role=button], button')].find((b) => /^(Post|Postar|Publicar|Programar|Agendar|Schedule)$/i.test(b.innerText.trim()) && b.getAttribute('aria-disabled') !== 'true')`
  if (!(await clickElement(browser, button))) throw new Error('Post button not found, see ' + preview)

  let closed = false
  for (let i = 0; i < 60 && !closed; i++) {
    await sleep(1000)
    closed = await browser.evaluate(`!(${dialog})`)
  }
  // The "Posted / View" toast can lag behind the dialog closing while the image uploads.
  let link = ''
  for (let i = 0; i < 15 && !link; i++) {
    await sleep(1000)
    link = await browser.evaluate(`[...document.querySelectorAll('a[href*="/post/"]')].find((a) => /^(View|Ver)$/i.test(a.innerText.trim()))?.href || ''`)
  }
  const after = await browser.screenshot(path.join(OUT, 'after.png'))
  if (!closed) throw new Error('composer did not close after posting, see ' + after)
  if (when) console.log('SCHEDULED ' + when.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) + ' | ' + after)
  else console.log('POSTED' + (link ? ' ' + link : '') + ' | ' + after)
}

// Accepts "DD/MM HH:MM", "DD/MM/YYYY HH:MM" or "YYYY-MM-DD HH:MM", in local time.
function parseWhen(value) {
  const m = value.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s+(\d{1,2}):(\d{2})$/) || value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})$/)
  if (!m) {
    console.error('--schedule: use "DD/MM HH:MM", "DD/MM/YYYY HH:MM" or "YYYY-MM-DD HH:MM"')
    process.exit(1)
  }
  const [day, month, year] = value.includes('/') ? [+m[1], +m[2], +(m[3] || new Date().getFullYear())] : [+m[3], +m[2], +m[1]]
  const date = new Date(year, month - 1, day, +m[4], +m[5])
  if (date.getDate() !== day || date <= new Date()) {
    console.error('--schedule: invalid or past date: ' + value)
    process.exit(1)
  }
  return date
}

// Composer "More" menu > "Schedule...": a month calendar, hour and minute fields, then "Done".
async function pickSchedule() {
  const more = `[...(${dialog}).querySelectorAll('[role=button][aria-label]')].find((e) => /^(Mais|More)$/.test(e.getAttribute('aria-label')))`
  if (!(await clickElement(browser, more))) throw new Error('composer menu not found')
  await sleep(1200)
  const item = `[...document.querySelectorAll('[role=menuitem], [role=menu] [role=button]')].find((e) => /^(Programar|Agendar|Schedule)/i.test(e.innerText.trim()))`
  if (!(await clickElement(browser, item))) throw new Error('"Schedule" option not found in the composer menu')
  await sleep(1500)

  const picker = `(() => { let p = document.querySelector('[role=grid]'); while (p && !p.querySelector('input')) p = p.parentElement; return p })()`
  const months = (locale) => new Intl.DateTimeFormat(locale, { month: 'long' }).format(when).toLowerCase()
  const [pt, en, year] = [months('pt-BR'), months('en-US'), String(when.getFullYear())]
  for (let i = 0; i < 13; i++) {
    const title = (await browser.evaluate(`(${picker})?.querySelector('[role=status]')?.innerText.toLowerCase() || ''`))
    if (title.includes(year) && (title.includes(pt) || title.includes(en))) break
    if (i === 12 || !(await clickElement(browser, `(${picker}).querySelector('button[aria-label="Próximo mês"], button[aria-label="Next month"]')`))) throw new Error('month not reachable in the calendar: ' + title)
    await sleep(500)
  }
  const d = when.getDate()
  const cell = `[...(${picker}).querySelectorAll('[role=gridcell]')].find((c) => c.getAttribute('aria-disabled') !== 'true' && new RegExp('\\\\b(${d} de ${pt}|${en} ${d})\\\\b', 'i').test(c.innerText))`
  if (!(await clickElement(browser, cell))) throw new Error(`day ${d} not selectable in the calendar`)
  await sleep(500)

  const pad = (n) => String(n).padStart(2, '0')
  for (const [index, value] of [[0, pad(when.getHours())], [1, pad(when.getMinutes())]]) {
    if (!(await clickElement(browser, `(${picker}).querySelectorAll('input')[${index}]`))) throw new Error('time field not found')
    for (const type of ['keyDown', 'keyUp']) await browser.send('Input.dispatchKeyEvent', { type, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 })
    await browser.send('Input.insertText', { text: value })
    await sleep(300)
  }
  const time = await browser.evaluate(`[...(${picker}).querySelectorAll('input')].map((i) => i.value.padStart(2, '0')).join(':')`)
  if (time !== `${pad(when.getHours())}:${pad(when.getMinutes())}`) throw new Error(`time field shows ${time}, expected ${pad(when.getHours())}:${pad(when.getMinutes())}`)

  if (!(await clickElement(browser, `[...(${picker}).querySelectorAll('[role=button], button')].find((b) => /^(Concluir|Done)$/i.test(b.innerText.trim()))`))) throw new Error('"Done" button not found in the schedule picker')
  await sleep(1000)
}

async function attachImage() {
  const { result } = await browser.send('Runtime.evaluate', {
    expression: `(${dialog}).querySelector('input[type=file]') || document.querySelector('input[type=file][accept*=image]')`,
  })
  if (!result?.objectId) throw new Error('image input not found in the composer')
  await browser.send('DOM.setFileInputFiles', { files: [image], objectId: result.objectId })
  for (let i = 0; i < 30; i++) {
    await sleep(500)
    if (await browser.evaluate(`!!(${dialog}).querySelector('img[src^="blob:"], video[src^="blob:"]')`)) return
  }
  throw new Error('image did not show up in the composer')
}
