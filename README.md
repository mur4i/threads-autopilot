# threads-autopilot

An agent skill that lets Claude Code, Codex, Gemini or any agent that reads `SKILL.md` use
**Threads** for you: post text or an image, reply, like and repost.

No Meta API, no app review, no tokens, no npm dependencies. Just Node and a Chromium browser
(Chrome, Edge, Brave or Chromium).

```
you   > post "shipping v2 today 🚀" on Threads
agent > here is the draft [preview.png]. Post it?
you   > yes
agent > POSTED https://www.threads.com/@you/post/...
```

## How it works

- **Chrome DevTools Protocol.** A ~130 line client (`scripts/cdp.mjs`) launches Chrome and
  drives it over a WebSocket: navigate, click, type, upload a file, take screenshots.
- **Your session, signed in by you.** `login.mjs` opens a normal browser window on a dedicated
  profile. You sign in yourself and close it. The agent never sees your password; it only reuses
  the session cookie, headless.
- **Preview first.** Every action can run with `--dry` and saves a screenshot, so the agent shows
  you exactly what will go out before it does.

## Install

Clone into your agent's skills folder:

```bash
# Claude Code
git clone https://github.com/mur4i/threads-autopilot ~/.claude/skills/threads-autopilot
# Codex
git clone https://github.com/mur4i/threads-autopilot ~/.codex/skills/threads-autopilot
```

Then sign in once:

```bash
cd ~/.claude/skills/threads-autopilot
node scripts/login.mjs
```

Ask your agent to post something. See [SKILL.md](SKILL.md) for every command.

## Commands

| Script | What it does |
| --- | --- |
| `login.mjs` | Opens a browser window so you can sign in; saves the session |
| `status.mjs` | `LOGGED IN` or `LOGGED OUT` |
| `post.mjs "text" [--image file] [--dry]` | Posts text, optionally with one image |
| `reply.mjs <url or @user> "text" [--dry]` | Replies to a post, or to someone's latest post |
| `interact.mjs <url> --like --repost` | Likes and/or reposts a post |

## Safety

The skill tells the agent to:

- never publish without your explicit confirmation;
- never type your password or 2FA code;
- never like, follow, repost or reply in bulk.

Keep it that way. Bulk automation is spam, and it is what gets accounts restricted.

## Disclaimer

This project is not affiliated with, endorsed by or connected to Meta or Threads. Automating the
Threads website may go against Meta's Terms of Use. Your account could be challenged or
restricted. Use it on your own account, at a human pace, at your own risk. If you need
high-volume or business use, use the official
[Threads API](https://developers.facebook.com/docs/threads).

Threads changes its markup from time to time. When a selector breaks, the error points to a
screenshot; issues and pull requests are welcome.

## License

[MIT](LICENSE)
