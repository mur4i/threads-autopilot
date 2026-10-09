# Changelog

## 1.5.1

- `post.mjs --schedule` checks Threads' answer and fails when the schedule was not stored, instead
  of printing `SCHEDULED` for a post that never goes out.

## 1.5.0

- `stats.mjs` reads views, likes, replies and reposts of a post, or of a profile's recent posts.

## 1.4.0

- `post.mjs --schedule "DD/MM HH:MM"` schedules the post on Threads itself, so it goes out with the
  computer off and no agent waiting.

## 1.3.0

- Installer and desktop shortcut speak Portuguese when Windows is in Portuguese, with examples of
  what to type to the AI.
- The skill tells the agent to answer in the user's language, in plain words.

## 1.2.0

- Double-click installer (`threads-autopilot-setup.cmd`) on the website: no terminal needed.
- The installer adds a **Threads Autopilot** desktop shortcut that opens `agy` ready to use.

## 1.1.0

- One-command Windows installer (`install.ps1`): installs Node.js and the Antigravity CLI when
  missing, puts the skill in the Antigravity and agent skills folders, and opens the sign-in.
- Falls back to Microsoft Edge or Chromium when Chrome is not installed.
- Website at https://mur4i.github.io/threads-autopilot
- Contributing guide, issue and pull request templates, CI.

## 1.0.0

- Post text, with an optional image, with a `--dry` preview.
- Reply to a post, or to someone's latest post.
- Like and repost.
- Sign-in through a plain browser window on a dedicated profile.
