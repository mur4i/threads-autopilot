# Contributing

Thanks for helping. Threads changes its markup often, so most contributions are small selector
fixes, and those are the most valuable ones: every fix reaches everyone who uses the skill.

## The fastest way: let your agent do it

When a script breaks, your agent usually fixes it on the spot by looking at the screenshot and
adjusting a selector. If that happens, ask it:

> Open a pull request to mur4i/threads-autopilot with this fix.

The skill tells agents to offer this, and to ask you first (a PR is public).

## By hand

1. Fork and clone the repo.
2. Sign in once: `node scripts/login.mjs` (uses its own browser profile, not yours).
3. Reproduce with `--dry` so nothing is posted: `node scripts/post.mjs "test" --dry`.
4. Fix it. The selectors live at the top of each script; keep matching both the English and the
   Portuguese labels (`Post`/`Postar`, `Reply`/`Responder`...), and add your language if it differs.
5. Test the script for real on your own account when the change touches the final click.
6. Open a pull request using the template.

## Rules for changes

- **No dependencies.** Node built-ins and the bundled `scripts/cdp.mjs` only.
- **Safety stays.** Preview before posting, the user signs in themselves, no bulk actions
  (mass like, follow, reply, DM or scraping). Pull requests that add bulk automation are closed.
- **Small and focused.** One fix or feature per pull request.
- Code, comments and messages in English; comments short, only when they explain a why.
- Keep [SKILL.md](SKILL.md) in sync: it is what agents read.

## New features

Open an [idea issue](https://github.com/mur4i/threads-autopilot/issues/new/choose) first so we
can agree on the shape. Good candidates: polls, several images, quote posts, reading a profile.

## Code of conduct

Be kind and assume good faith. Harassment, hate or spam in issues and pull requests gets removed
and the author blocked.
