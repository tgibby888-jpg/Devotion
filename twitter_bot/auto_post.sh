#!/bin/bash
# Devotion Twitter Auto-Poster
# Posts 2 tweets per day (10am, 7pm EST)
# Runs via cron — no manual action needed

source /home/team/shared/twitter_bot/setup_env.sh

COUNTER_FILE="/home/team/shared/twitter_bot/day_counter.txt"
LOG_FILE="/home/team/shared/twitter_bot/post_log.txt"

# Initialize counter
if [ ! -f "$COUNTER_FILE" ]; then
  echo "1" > "$COUNTER_FILE"
fi

DAY=$(cat "$COUNTER_FILE")
HOUR=$(date +%H)
TIME_OF_DAY="morning"
if [ "$HOUR" -ge 17 ]; then
  TIME_OF_DAY="evening"
fi

echo "[$(date)] Day $DAY — $TIME_OF_DAY post" >> "$LOG_FILE"

# Pull tweets from the content calendar
# Format: "Tweet 1: text" and "Tweet 2: text" per day
TWEET_FILE="/home/team/shared/content/ready-to-post.md"

# Extract the 20 Twitter posts from the content file
# They're numbered 1-20
TWEET_NUM=$(( (DAY - 1) * 2 + 1 ))
if [ "$TIME_OF_DAY" = "evening" ]; then
  TWEET_NUM=$(( TWEET_NUM + 1 ))
fi

# Get the tweet text (just use the line number approach)
TWEET_TEXT=$(grep -A2 "Tweet $TWEET_NUM" "$TWEET_FILE" | tail -1 | sed 's/^[[:space:]]*["“]//' | sed 's/["”][[:space:]]*$//')

if [ -n "$TWEET_TEXT" ]; then
  cd /home/team/shared/twitter_bot && node post_tweet.js "$TWEET_TEXT" 2>&1 | tee -a "$LOG_FILE"
  echo "[$(date)] Posted tweet $TWEET_NUM: $TWEET_TEXT" >> "$LOG_FILE"
else
  echo "[$(date)] No tweet text found for tweet $TWEET_NUM" >> "$LOG_FILE"
fi

# After evening post, advance the day
if [ "$TIME_OF_DAY" = "evening" ]; then
  echo $((DAY + 1)) > "$COUNTER_FILE"
  echo "[$(date)] Advanced to Day $((DAY + 1))" >> "$LOG_FILE"
fi