# Security

## What is sensitive

The browser profile in `~/.config/threads-autopilot/chrome-profile` (or `THREADS_PROFILE`) holds
your logged-in Threads session. Anyone with a copy of that folder can act as you on Threads.

- Never commit it, share it or upload it.
- To revoke it, log out of that session from your account's security settings (the list of
  devices where you are logged in) and delete the folder.

The scripts never read, store or send your password, and never send data anywhere except
threads.com through the local browser.

## Reporting a vulnerability

Please report privately through
[GitHub security advisories](https://github.com/mur4i/threads-autopilot/security/advisories/new),
not in a public issue. You will get an answer as soon as possible.
