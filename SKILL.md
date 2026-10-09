---
name: threads-autopilot
description: Lets an AI agent use Threads (threads.com) for the user without Meta's API - post text or an image, reply to a post, like and repost - through a headless Chrome that reuses a session the user signed into once. Every public action is previewed (screenshot) and only sent after the user confirms. Use when asked to "post on Threads", "reply to X on Threads", "like/repost this thread", "is Threads logged in?", or to announce a release on Threads.
---

# Threads Autopilot

Scripts in `scripts/` (Node 18+, no dependencies), run from this skill's folder. They need a
Chromium browser: Chrome, Edge, Brave or Chromium (set `CHROME` to its path if it is not found).

The session lives in a dedicated browser profile, `~/.config/threads-autopilot/chrome-profile`
(override with `THREADS_PROFILE`). It is separate from the user's own browser and must never be
copied, committed or sent anywhere: it holds their logged-in Threads session.

## Golden rules

1. **Nothing public without the user's word.** Run with `--dry`, show the final text and the
   preview screenshot, and only send after an explicit "post it" (or equivalent). Posts, replies,
   likes and reposts are public and carry the user's name.
2. **The user signs in, never the agent.** Do not type passwords or 2FA codes.
3. **One action at a time, on request.** Never loop over posts, users or feeds to like, follow,
   repost or reply in bulk. Bulk automation is spam and gets accounts restricted.
4. Write the text the user asked for; do not invent claims in their name.
5. **Speak the user's language, simply.** Many users are not technical and may not read English.
   Answer in the language they write in, in short plain sentences, without jargon (no "CDP",
   "headless", "selector"). Say what you will do, show the preview, and ask a clear yes or no
   question, for example "Vai ficar assim. Posso postar? (sim ou não)".

## Sign in (once, or when the session drops)

```bash
node scripts/login.mjs
```

Opens a **plain** browser window (no debugging port or automation flags, otherwise Meta blocks the
sign-in) on the Threads login page. The user signs in and **closes the window**; the script then
checks the `sessionid` cookie headless and prints `LOGGED IN`. Run it in the background and tell
the user to sign in and close the window.

```bash
node scripts/status.mjs        # LOGGED IN | LOGGED OUT
```

## Post

```bash
node scripts/post.mjs "text" --dry                 # open the composer and take a screenshot only
node scripts/post.mjs "text"                       # post
node scripts/post.mjs --file post.txt              # text from a file (multi-line)
node scripts/post.mjs "text" --image photo.jpg     # with one image (png or jpg)
node scripts/post.mjs "text" --schedule "09/10 19:00"   # schedule it on Threads (local time)
```

Opens `threads.com/intent/post?text=...` headless, waits for the composer, attaches the image
through the composer's file input, saves `preview.png`, clicks Post and waits for the dialog to
close. Output: `POSTED <link from the "Posted / View" toast> | after.png`. Screenshots go to
`<tmp>/threads-autopilot` (override with `THREADS_OUT`); open them to check. Limit: 500
characters (checked before opening the browser).

`--schedule` takes `DD/MM HH:MM`, `DD/MM/YYYY HH:MM` or `YYYY-MM-DD HH:MM` in local time. It opens the
composer's More menu > Schedule, picks the day and time and clicks Schedule instead of Post, so
Threads publishes it by itself: the computer can be off and no agent has to wait. Output:
`SCHEDULED <date> | after.png`. With `--dry` the preview shows the "Will be posted on..." banner.
Scheduled posts are listed and can be cancelled in the Threads app. Prefer scheduling over keeping
an agent awake to post later.

## Reply

```bash
node scripts/reply.mjs @user "text" --dry          # their latest post (by timestamp, skips pinned)
node scripts/reply.mjs <post url> "text"           # a specific post
node scripts/reply.mjs <post url> --file reply.txt
```

Prints the target post's text first (show it to the user), types into the "Reply to ..." box,
saves `reply-preview.png`, clicks the send arrow and waits until the reply shows up and the
"Posting..." toast is gone. A thread of your own is just several replies to your root post.

## Stats

```bash
node scripts/stats.mjs <post url>                          # one post
node scripts/stats.mjs @user --since 08/10 --limit 30      # recent posts of a profile
node scripts/stats.mjs @user --json stats.json             # also save the numbers
```

Prints, per post: date, views, likes, replies, reposts, shares and the start of the text. Views
come from the "N views" line on the post page, the rest from the action bar. Replies the account
made on its own posts are skipped in profile mode. Use it to see which posts are gaining reach
(for example, before replying with a link) and to compare formats.

## Like and repost

```bash
node scripts/interact.mjs <post url> --like --repost
```

Acts on the main post of the page and skips what is already done.

## When it breaks

Threads changes its markup. The selectors are few and documented in the scripts:

- composer: `[role=dialog]` holding a `[contenteditable=true]`, button text `Post`
- reply: the `[contenteditable=true]` box, send button whose svg is labelled `Reply`
- like / repost: svg `<title>` `Like` / `Repost` inside the first `[data-pressable-container=true]`

Both English and Portuguese labels are matched. On failure, open the screenshot the error points
to and adjust the selector. `LOGGED OUT` means the session expired or Meta asked for a check: run
`login.mjs` with the user. If headless gets blocked, `openThreads({ headless: false })` shows the
browser.

## Send fixes upstream

This skill lives at https://github.com/mur4i/threads-autopilot. After you fix a selector or a
bug and it works, tell the user and offer to open a pull request there so everyone gets the fix
(fork, branch, commit only the fix, `gh pr create` filling the template). A pull request is
public: open it only after the user says yes. If they decline, suggest opening an issue with the
error and screenshot instead. Never include the browser profile, screenshots with private data
or the user's posts in a pull request.

Updating: on Windows, run the installer command again; elsewhere, `git pull` in this folder.
