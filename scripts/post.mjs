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
const values = new Set([file, flag('--image')])
const text = file ? fs.readFileSync(file, 'utf8').trim() : argv.find((a) => !a.startsWith('--') && !values.has(a))
if (!text) {
  console.error('usage: node scripts/post.mjs "text" | --file post.txt  [--image photo.jpg] [--dry]')
  process.exit(1)
}
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
  const preview = await browser.screenshot(path.join(OUT, 'preview.png'))
  if (!ready) throw new Error('composer did not open, see ' + preview)
  console.log('draft ready: ' + preview)
  if (dry) return

  const button = `[...(${dialog}).querySelectorAll('[role=button], button')].find((b) => /^(Post|Postar|Publicar)$/i.test(b.innerText.trim()) && b.getAttribute('aria-disabled') !== 'true')`
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
  console.log('POSTED' + (link ? ' ' + link : '') + ' | ' + after)
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
