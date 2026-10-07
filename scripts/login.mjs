// Opens a plain Chrome (no debugging, so Meta sees a normal browser) on the profile; the user signs in and closes it.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { findChrome } from './cdp.mjs'
import { openThreads, isLoggedIn, SITE, PROFILE } from './threads.mjs'

fs.mkdirSync(PROFILE, { recursive: true })
console.log('sign in to Threads in the window that opened, then CLOSE the window...')
const chrome = spawn(findChrome(), [`--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check', `${SITE}/login`])
await new Promise((r) => chrome.once('exit', r))

const browser = await openThreads()
try {
  const ok = await isLoggedIn(browser)
  console.log(ok ? 'LOGGED IN, session saved in ' + PROFILE : 'LOGGED OUT: the sign-in was not saved')
  if (!ok) process.exitCode = 1
} finally {
  await browser.close()
}
