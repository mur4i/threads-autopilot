// Shared Threads session: Chrome with a kept profile where the user signed in once (login.mjs).
import os from 'node:os'
import path from 'node:path'
import { openBrowser, sleep } from './cdp.mjs'

export { sleep }
export const SITE = 'https://www.threads.com'
export const PROFILE = process.env.THREADS_PROFILE || path.join(os.homedir(), '.config', 'threads-autopilot', 'chrome-profile')
export const OUT = process.env.THREADS_OUT || path.join(os.tmpdir(), 'threads-autopilot')

export async function openThreads({ headless = true } = {}) {
  const browser = await openBrowser({
    profile: PROFILE,
    headless,
    args: ['--disable-blink-features=AutomationControlled', '--window-size=1280,900'],
    viewport: headless ? { width: 1280, height: 900 } : undefined,
  })
  await browser.send('Network.enable')
  if (headless) {
    // Headless announces itself in the user agent; Meta blocks that.
    const { userAgent } = await browser.send('Browser.getVersion')
    await browser.send('Network.setUserAgentOverride', { userAgent: userAgent.replace('HeadlessChrome', 'Chrome') })
  }
  return browser
}

export async function isLoggedIn(browser) {
  const { cookies } = await browser.send('Network.getCookies', { urls: [SITE] })
  return cookies.some((c) => c.name === 'sessionid' && c.value)
}

export async function goto(browser, url, wait = 4000) {
  await browser.send('Page.navigate', { url })
  await sleep(wait)
}

// Real mouse click at the element center, found by a JS expression that returns the element.
export async function clickElement(browser, finder) {
  const rect = await browser.evaluate(`(() => { const el = ${finder}; if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
  if (!rect || typeof rect !== 'object') return false
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased'])
    await browser.send('Input.dispatchMouseEvent', { type, x: rect.x, y: rect.y, button: 'left', clickCount: 1 })
  return true
}

export function checkLength(text) {
  const n = [...text].length
  if (n > 500) {
    console.error(`text has ${n} characters, Threads allows 500`)
    process.exit(1)
  }
}
