# KPIs: is the account going well?

`scripts/kpi.mjs` keeps a history per account and exports it for a dashboard (or any chart tool).

```bash
node scripts/kpi.mjs @user [--days 7] [--limit 80] [--out dir]   # collect, then export all accounts
node scripts/kpi.mjs                                             # export only
```

- History: `~/.config/threads-autopilot/kpi/<user>.json` (followers per day, latest numbers per post).
  Override the folder with `KPI_DIR`.
- Export: `posts.json` (account, url, posted, day, hour, format, text, views, likes, replies,
  reposts, shares, checked) and `followers.json` (account, day, followers), every account in the folder.
- Run it once a day per account. The follower trend only exists from the first run on.
- Another account: point `THREADS_PROFILE` at its profile. If something else is using that profile
  right now (a posting loop), copy the profile without its caches and point at the copy.

## Formats

Guessed per post: `imagem` (has media), `frase` (short), `história 1ª pessoa` (an "eu/meu/minha"
in the first 80 characters) or `história 3ª pessoa`. Fix wrong guesses or add your own labels
(`psicologia`, `pergunta`) in `kpi/formats.json`: `{"<post url>": "<format>"}`.

## Indicators and bands

Week = posts of the last 7 days that are at least 24h old (views still climb before that).

| Indicator | Good | Watch | Bad |
| --- | --- | --- | --- |
| New followers per day | 10+ | 3 to 10 | under 3 |
| Followers per 1,000 views | 2+ | 0.5 to 2 | under 0.5 |
| Median views per post vs the week before | 90%+ | 60 to 90% | under 60% |
| Likes per view | 5%+ | 3 to 5% | under 3% |
| Shares and reposts per view | 0.5%+ | 0.2 to 0.5% | under 0.2% |
| Flops (under half the 30 day median) | up to 25% | up to 45% | more |

Format verdict (last 14 days, 3+ posts): keep when its median reaches 80% of the account median
and likes pass 3%; cut when under 50% or likes under 2%; otherwise watch.

## What to do with it

- Before writing a day's queue, read the format table: drop what says cut, give the best slots
  (the hour chart) to what says keep. No need to ask before doing that.
- High views with low followers per 1,000 views: the posts reach people who see no reason to
  follow. Fix the bio and pinned post, keep the account on one clear promise.
- Median views falling while posts per day went up: post less.
