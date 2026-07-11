#!/bin/bash
# Twitter Auto-Poster
# Runs 2x daily at 10am and 7pm EST
# Posts tweets from the ready-to-post content calendar

source /home/team/shared/twitter_bot/setup_env.sh

# Read the ready-to-post content, extract tweets
TWEET_FILE="/home/team/shared/content/ready-to-post.md"

# Send a tweet — first argument is the text
post_tweet() {
  local text="$1"
  cd /home/team/shared/twitter_bot && node post_tweet.js "$text"
}

# Get today's day number (1-30 from launch)
# We track which day we're on via a counter file
COUNTER_FILE="/home/team/shared/twitter_bot/day_counter.txt"
if [ ! -f "$COUNTER_FILE" ]; then
  echo "1" > "$COUNTER_FILE"
fi

DAY=$(cat "$COUNTER_FILE")
echo "Posting tweets for Day $DAY"

# Post morning tweet (10am EST)
# Post evening tweet (7pm EST)

# After posting, increment counter
echo $((DAY + 1)) > "$COUNTER_FILE"
echo "Day $DAY tweets posted. Next: Day $((DAY + 1))"