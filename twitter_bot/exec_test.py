#!/usr/bin/env python3
"""Execute and output results to a JSON file for verification."""
import subprocess, json, os, sys

result_file = '/tmp/bot_test_results.json'

os.environ['TWITTER_API_KEY'] = 'gg2lFESkgdRDTOEki9yX4QSAT'
os.environ['TWITTER_API_SECRET'] = 'SMxiD82wb1VZY1hgeYge3P9zfmlZL6FNN5HCQO2ujA3rmtomRY'
os.environ['TWITTER_BEARER_TOKEN'] = 'AAAAAAAAAAAAAAAAAAAAAGok+gEAAAAA/lGdKM+GLBPFN7GiWz7XolJca98=9MqCiDpMw2hjFyV4LkQjcx5fkw3xx8fJdFv5ww1vhGMfs2aSxY'
os.environ['TWITTER_ACCESS_TOKEN'] = '2074129609503776768-RGpARyGcUGzvRQFm1myo0L6fabLH9y'
os.environ['TWITTER_ACCESS_SECRET'] = 'FbmeMIo7T84k2XY5XOv9Ahf4c5oY1mn8GF0vMlyiEc0lN'

results = {}

# Step 1: Test --list parsing
try:
    r = subprocess.run(['node', '/home/team/shared/twitter_bot/post_tweet.js', '--list'],
        capture_output=True, text=True, timeout=15, env=os.environ)
    results['list_stdout'] = r.stdout[:3000]
    results['list_stderr'] = r.stderr[:500]
    results['list_retcode'] = r.returncode
except Exception as e:
    results['list_error'] = str(e)

# Step 2: Check queue
queue_path = '/home/team/shared/twitter_bot/tweet_queue.json'
if os.path.exists(queue_path):
    with open(queue_path) as f:
        q = json.load(f)
    results['queue'] = {
        'queued': len(q.get('queued', [])),
        'sent': len(q.get('sent', [])),
        'failed': len(q.get('failed', [])),
        'first_queued': q.get('queued', [{}])[0] if q.get('queued') else None
    }
else:
    results['queue'] = 'not_created_yet'

# Step 3: Verify node works
try:
    r = subprocess.run(['node', '--version'], capture_output=True, text=True, timeout=5)
    results['node_version'] = r.stdout.strip()
except:
    results['node_version'] = 'NOT_FOUND'

with open(result_file, 'w') as f:
    json.dump(results, f, indent=2)

print(f"Results written to {result_file}")
