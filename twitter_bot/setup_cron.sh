#!/bin/bash
# Run this to set up the Twitter auto-poster cron
exec > /home/team/shared/twitter_bot/setup_result.txt 2>&1
set -x

chmod +x /home/team/shared/twitter_bot/auto_post.sh
chmod +x /home/team/shared/twitter_bot/setup_env.sh

# Install twitter-api-v2 if not already installed
cd /home/team/shared/twitter_bot
if [ ! -d "node_modules/twitter-api-v2" ]; then
  npm init -y
  npm install twitter-api-v2
fi

# Set up cron
(crontab -l 2>/dev/null | grep -v "auto_post.sh"; echo "0 14 * * * /home/team/shared/twitter_bot/auto_post.sh # 10am EST"; echo "0 23 * * * /home/team/shared/twitter_bot/auto_post.sh # 7pm EST") | crontab -

echo "--- Current crontab ---"
crontab -l
echo "--- Setup complete ---"