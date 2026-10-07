# threads-autopilot

[![CI](https://github.com/mur4i/threads-autopilot/actions/workflows/ci.yml/badge.svg)](https://github.com/mur4i/threads-autopilot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Website](https://img.shields.io/badge/site-mur4i.github.io-black)](https://mur4i.github.io/threads-autopilot)
[![Sponsor](https://img.shields.io/badge/sponsor-%E2%99%A5-ea4aaa)](https://github.com/sponsors/mur4i)

An agent skill that lets Gemini (Antigravity), Claude Code, Codex or any agent that reads
`SKILL.md` use **Threads** for you: post text or an image, reply, like and repost.

No Meta API, no app review, no tokens, no npm dependencies. Just Node and a Chromium browser
(Chrome, Edge, Brave or Chromium).

```
you   > post "shipping v2 today 🚀" on Threads
agent > here is the draft [preview.png]. Post it?
you   > yes
agent > POSTED https://www.threads.com/@you/post/...
```

## Install

### Windows (no terminal needed)

1. Download [threads-autopilot-setup.cmd](https://mur4i.github.io/threads-autopilot/threads-autopilot-setup.cmd) and open it. If Windows warns you, click **More info** > **Run anyway**.
2. It installs Node.js and the Antigravity CLI (`agy`) if they are missing, puts the skill in the Antigravity skills folders and opens a browser window: sign in to Threads and close it.
3. Double-click **Threads Autopilot** on your desktop and ask it to post something.

Run the installer again to update. From a terminal, the same thing is:

```powershell
irm https://raw.githubusercontent.com/mur4i/threads-autopilot/main/install.ps1 | iex
```

### macOS, Linux, or any agent

With Node 18+ and Chrome, clone into your agent's skills folder and sign in once:

```bash
git clone https://github.com/mur4i/threads-autopilot ~/.claude/skills/threads-autopilot
cd ~/.claude/skills/threads-autopilot && node scripts/login.mjs
```

| Agent | Skills folder |
| --- | --- |
| Claude Code | `~/.claude/skills` |
| Codex | `~/.codex/skills` |
| Antigravity CLI (`agy`) | `~/.gemini/config/skills` |
| Antigravity IDE | `~/.gemini/antigravity/skills` |

## Commands

The agent runs these for you; see [SKILL.md](SKILL.md) for the details it follows.

| Script | What it does |
| --- | --- |
| `login.mjs` | Opens a browser window so you can sign in; saves the session |
| `status.mjs` | `LOGGED IN` or `LOGGED OUT` |
| `post.mjs "text" [--image file] [--dry]` | Posts text, optionally with one image |
| `reply.mjs <url or @user> "text" [--dry]` | Replies to a post, or to someone's latest post |
| `interact.mjs <url> --like --repost` | Likes and/or reposts a post |

## How it works

- **Chrome DevTools Protocol.** A ~130 line client (`scripts/cdp.mjs`) launches the browser and
  drives it over a WebSocket: navigate, click, type, upload a file, take screenshots.
- **Your session, signed in by you.** `login.mjs` opens a normal browser window on a dedicated
  profile. You sign in yourself and close it. The agent never sees your password; it only reuses
  the session cookie, headless.
- **Preview first.** Every action can run with `--dry` and saves a screenshot, so the agent shows
  you exactly what will go out before it does.

## Safety

The skill tells the agent to:

- never publish without your explicit confirmation;
- never type your password or 2FA code;
- never like, follow, repost or reply in bulk.

Keep it that way. Bulk automation is spam, and it is what gets accounts restricted. See
[SECURITY.md](SECURITY.md) for how the session is stored.

## Contributing

Threads changes its layout often. When something breaks and your agent fixes it, it will offer
to send the fix here as a pull request, so everyone gets it. Ideas and bugs go in
[issues](https://github.com/mur4i/threads-autopilot/issues/new/choose). Read
[CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Sponsor

If this saves you time, consider [sponsoring the project](https://github.com/sponsors/mur4i).

## Disclaimer

This project is not affiliated with, endorsed by or connected to Meta or Threads. Automating the
Threads website may go against Meta's Terms of Use. Your account could be challenged or
restricted. Use it on your own account, at a human pace, at your own risk. For high-volume or
business use, use the official [Threads API](https://developers.facebook.com/docs/threads).

## License

[MIT](LICENSE)
