#!/usr/bin/env python3
import subprocess, json, os, sys

# Direct execution - captures to known file
result_file = '/tmp/bt_results.json'

os.environ['TWITTER_API_KEY'] = 'gg2lFESkgdRDTOEki9yX4QSAT'
os.environ['TWITTER_API_SECRET'] = 'SMxiD82wb1VZY1hgeYge3P9zfmlZL6FNN5HCQO2ujA3rmtomRY'
os.environ['TWITTER_BEARER_TOKEN'] = 'AAAAAAAAAAAAAAAAAAAAAGok+gEAAAAA/lGdKM+GLBPFN7GiWz7XolJca98=9MqCiDpMw2hjFyV4LkQjcx5fkw3xx8fJdFv5ww1vhGMfs2aSxY'
os.environ['TWITTER_ACCESS_TOKEN'] = '2074129609503776768-RGpARyGcUGzvRQFm1myo0L6fabLH9y'
os.environ['TWITTER_ACCESS_SECRET'] = 'FbmeMIo7T84k2XY5XOv9Ahf4c5oY1mn8GF0vMlyiEc0lN'

out = {}

# Check node version
r = subprocess.run(['node', '--version'], capture_output=True, text=True, timeout=5)
out['node'] = r.stdout.strip()
out['node_err'] = r.stderr.strip()

# Run --list
r = subprocess.run(['node', '/home/team/shared/twitter_bot/post_tweet.js', '--list'],
    capture_output=True, text=True, timeout=15, env=os.environ)
out['list_stdout'] = r.stdout[:3000]
out['list_stderr'] = r.stderr[:1000]
out['list_code'] = r.returncode

# Check queue
qp = '/home/team/shared/twitter_bot/tweet_queue.json'
if os.path.exists(qp):
    with open(qp) as f:
        q = json.load(f)
    out['queue_queued'] = len(q.get('queued',[]))
    out['queue_sent'] = len(q.get('sent',[]))
    out['queue_failed'] = len(q.get('failed',[]))

with open(result_file, 'w') as f:
    json.dump(out, f, indent=2)

print(f"OK: {result_file}")
