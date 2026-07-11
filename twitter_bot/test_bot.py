#!/usr/bin/env python3
"""Test the tweet bot by running it via subprocess and capturing output."""
import subprocess, sys, os, json

# 1. Test that node is available
try:
    r = subprocess.run(['which', 'node'], capture_output=True, text=True)
    print(f"Node: {r.stdout.strip() or 'NOT FOUND'}")
except:
    print("Node: NOT FOUND")

# 2. Test parsing by running --list
r = subprocess.run(
    ['node', '/home/team/shared/twitter_bot/post_tweet.js', '--list'],
    capture_output=True, text=True, timeout=15
)
print(f"\nSTDOUT:\n{r.stdout[:2000]}")
print(f"\nSTDERR:\n{r.stderr[:500]}")
print(f"\nExit code: {r.returncode}")

# 3. Check env vars
for var in ['TWITTER_API_KEY', 'TWITTER_API_SECRET', 'TWITTER_BEARER_TOKEN', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_SECRET']:
    val = os.environ.get(var, '')
    print(f"{var}: {'SET (' + val[:8] + '...)' if val else 'NOT SET'}")

# 4. Check if tweet_queue.json was created
queue_path = '/home/team/shared/twitter_bot/tweet_queue.json'
if os.path.exists(queue_path):
    with open(queue_path) as f:
        q = json.load(f)
    print(f"\nQueue: {len(q.get('queued', []))} queued, {len(q.get('sent', []))} sent, {len(q.get('failed', []))} failed")
else:
    print(f"\nQueue file not created yet")
