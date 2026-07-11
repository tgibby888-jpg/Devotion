#!/bin/bash
cd /home/team/shared/twitter_bot
source setup_env.sh
node post_tweet.js --test > /home/team/shared/twitter_bot/test_result.txt 2>&1
echo "Exit code: $?" >> /home/team/shared/twitter_bot/test_result.txt