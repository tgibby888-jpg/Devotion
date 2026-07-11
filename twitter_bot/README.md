# Devotion Twitter Bot — Setup & Usage

> **Zero-dependency tweet poster** using native Node.js (`https` + `crypto` + `fs`)
> Reads from `/home/team/shared/content/ready-to-post.md` calendar
> Last updated: 2026-07-06

---

## Files

| File | Purpose |
|---|---|
| `post_tweet.js` | **Main bot script** — parse calendar, post tweets, manage queue (zero npm dependencies) |
| `setup.js` | Helper — installs twitter-api-v2, sets up cron jobs |
| `auto_post.sh` | Cron-friendly shell wrapper (sources env, posts by day/time) |
| `setup_env.sh` | All 5 Twitter credentials pre-configured |
| `tweet_queue.json` | Auto-created tracking file (sent/failed/queued) |

---

## Quick Start

### 1. List queued tweets

```bash
cd /home/team/shared/twitter_bot
source setup_env.sh
node post_tweet.js --list
```

### 2. Test API connection

```bash
source setup_env.sh
node post_tweet.js --test
```

### 3. Post next unsent tweet

```bash
source setup_env.sh
node post_tweet.js --now
```

### 4. Post all remaining tweets

```bash
source setup_env.sh
node post_tweet.js --all
```

### 5. Auto-poster (cron)

```bash
node setup.js
# This creates cron jobs for 10am and 7pm EST daily
```

---

## Commands

| Command | What it does |
|---|---|
| `--list` | Show queue status (sent/failed/queued) |
| `--test` | Test Twitter API v2 connection |
| `--now` | Post the next unsent tweet immediately |
| `--day 5` | Post all unsent tweets for Day 5 |
| `--all` | Post all queued tweets (max 20 per run) |

---

## How It Works

1. On first run (`--list`), the bot parses `ready-to-post.md` and builds a queue
2. Each tweet is tracked by `day-time` (e.g., `1-10am`, `1-7pm`)
3. Posted tweets move to `sent[]`, failed ones to `failed[]`
4. Queue persists in `tweet_queue.json` — resuming is safe
5. Tweets are truncated to 280 chars (with ellipsis) if needed
6. OAuth 1.0a HMAC-SHA1 signatures are generated natively — no npm dependency

---

## Credentials

All 5 credentials are in `setup_env.sh`:
- `TWITTER_API_KEY`
- `TWITTER_API_SECRET`
- `TWITTER_BEARER_TOKEN`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_SECRET`

The OAuth 1.0a tokens are required for posting. The Bearer token is read-only (for connection testing).
