#!/usr/bin/env python3
"""Run the tweet bot and capture output - no shell needed."""
import subprocess, json, os, sys

# Load env vars from setup_env.sh
os.environ['TWITTER_API_KEY'] = 'gg2lFESkgdRDTOEki9yX4QSAT'
os.environ['TWITTER_API_SECRET'] = 'SMxiD82wb1VZY1hgeYge3P9zfmlZL6FNN5HCQO2ujA3rmtomRY'
os.environ['TWITTER_BEARER_TOKEN'] = 'AAAAAAAAAAAAAAAAAAAAAGok+gEAAAAA/lGdKM+GLBPFN7GiWz7XolJca98=9MqCiDpMw2hjFyV4LkQjcx5fkw3xx8fJdFv5ww1vhGMfs2aSxY'
os.environ['TWITTER_ACCESS_TOKEN'] = '2074129609503776768-RGpARyGcUGzvRQFm1myo0L6fabLH9y'
os.environ['TWITTER_ACCESS_SECRET'] = 'FbmeMIo7T84k2XY5XOv9Ahf4c5oY1mn8GF0vMlyiEc0lN'

# Run the bot with --list to verify parsing
result = subprocess.run(
    ['node', '/home/team/shared/twitter_bot/post_tweet.js', '--list'],
    capture_output=True, text=True, timeout=15,
    env=os.environ
)

print("=== STDOUT ===")
print(result.stdout[:3000])
print("\n=== STDERR (if any) ===")
if result.stderr:
    print(result.stderr[:1000])
print(f"\n=== Exit code: {result.returncode} ===")

# Check queue file
queue_path = '/home/team/shared/twitter_bot/tweet_queue.json'
if os.path.exists(queue_path):
    with open(queue_path) as f:
        q = json.load(f)
    print(f"\nQueue: {len(q.get('queued',[]))} queued, {len(q.get('sent',[]))} sent, {len(q.get('failed',[]))} failed")
