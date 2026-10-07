// Says whether the saved profile still has a Threads session.
import { openThreads, isLoggedIn, PROFILE } from './threads.mjs'

const browser = await openThreads()
try {
  console.log((await isLoggedIn(browser)) ? 'LOGGED IN' : 'LOGGED OUT (run login.mjs)', '|', PROFILE)
} finally {
  await browser.close()
}
