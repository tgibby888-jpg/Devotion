#!/usr/bin/env node

/**
 * Devotion Tweet Bot — Zero dependencies, uses native https module
 * Posts tweets via Twitter API v2 (OAuth 1.0a user context)
 * 
 * Usage:
 *   node post_tweet.js --list     # Show tweet queue
 *   node post_tweet.js --now      # Post next unsent tweet
 *   node post_tweet.js --day 3    # Post tweets for a specific day
 *   node post_tweet.js --all      # Post ALL unsent tweets
 *   node post_tweet.js            # Check schedule status
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_FILE = path.join(__dirname, 'tweet_queue.json');
const CALENDAR_FILE = path.join(__dirname, '..', 'content', '14-day-content-calendar.md');

// ── Parse Twitter credentials from env ──
const CREDS = {
  apiKey: process.env.TWITTER_API_KEY || '',
  apiSecret: process.env.TWITTER_API_SECRET || '',
  bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
  accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
  accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
};

// ── Parse the content calendar ──
function parseCalendar() {
  const content = fs.readFileSync(CALENDAR_FILE, 'utf-8');
  const tweets = [];
  let currentDay = null;
  let currentTime = null;
  let currentText = [];
  let inTweet = false;

  for (const line of content.split('\n')) {
    // Track code blocks
    if (line.trim().startsWith('```')) { inTweet = !inTweet; continue; }
    if (inTweet && line.trim().startsWith('```')) { inTweet = false; continue; }

    const dayMatch = line.match(/^## Day (\d+)/);
    if (dayMatch) { currentDay = parseInt(dayMatch[1]); continue; }

    const t1 = line.match(/^### Tweet 1 \((\d+)(am|pm)/);
    const t2 = line.match(/^### Tweet 2 \((\d+)(am|pm)/);
    if (t1 || t2) {
      // Save previous tweet if exists
      if (currentText.length > 0 && currentDay && currentTime) {
        tweets.push({ day: currentDay, time: currentTime, text: currentText.join('\n').trim() });
      }
      currentTime = t1 ? '10am' : '7pm';
      currentText = [];
      continue;
    }

    // Capture text between tweet markers
    if (currentTime && currentDay) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('>') && !trimmed.startsWith('|') && !trimmed.startsWith('*')) {
        currentText.push(trimmed);
      } else if (trimmed === '' && currentText.length > 0) {
        // Blank line — could be end of tweet. But tweets can have blank lines.
        // Only finalize when we hit a new heading
      }
      // Stop at next heading
      if (trimmed.startsWith('###') || trimmed.match(/^#{2,4}/)) {
        if (currentText.length > 0) {
          tweets.push({ day: currentDay, time: currentTime, text: currentText.join('\n').trim() });
        }
        currentTime = null;
        currentText = [];
      }
    }
  }

  // Flush last tweet
  if (currentText.length > 0 && currentDay && currentTime) {
    tweets.push({ day: currentDay, time: currentTime, text: currentText.join('\n').trim() });
  }

  return tweets.map(t => ({ ...t, text: t.text.replace(/\n{3,}/g, '\n\n').trim() }));
}

// ── Tweet queue ──
function loadQueue() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {}
  return { sent: [], failed: [], queued: [] };
}

function saveQueue(q) { fs.writeFileSync(DATA_FILE, JSON.stringify(q, null, 2)); }

function buildQueue() {
  const queue = loadQueue();
  const allTweets = parseCalendar();
  const sentIds = new Set([...queue.sent, ...queue.failed].map(s => s.id));
  
  queue.queued = allTweets.filter(t => !sentIds.has(`${t.day}-${t.time}`));
  saveQueue(queue);
  return queue;
}

// ── OAuth 1.0a signature (used for Twitter API v2 tweet posting) ──
// This implements HMAC-SHA1 signature generation for OAuth 1.0a
function createOAuthHeader(method, url, params = {}) {
  const oauth = {
    oauth_consumer_key: CREDS.apiKey,
    oauth_token: CREDS.accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000),
    oauth_nonce: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    oauth_version: '1.0',
  };

  // Collect all params (OAuth + request params)
  const allParams = { ...params, ...oauth };
  const paramKeys = Object.keys(allParams).sort();
  
  // Create parameter string
  const paramStr = paramKeys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(String(allParams[k]))}`)
    .join('&');

  // Create signature base string
  const sigBase = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`;

  // Create signing key
  const signingKey = `${encodeURIComponent(CREDS.apiSecret)}&${encodeURIComponent(CREDS.accessSecret)}`;

  // Generate HMAC-SHA1 signature
  const crypto = require('crypto');
  const signature = crypto.createHmac('sha1', signingKey).update(sigBase).digest('base64');
  
  oauth.oauth_signature = signature;

  // Build Authorization header
  const authHeader = 'OAuth ' + Object.entries(oauth)
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(String(v))}"`)
    .join(', ');

  return authHeader;
}

// ── HTTPS request helper ──
function httpsRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Post a tweet via Twitter API v2 ──
async function postTweet(text) {
  if (!CREDS.apiKey || !CREDS.apiSecret || !CREDS.accessToken || !CREDS.accessSecret) {
    return { success: false, error: 'Missing OAuth 1.0a credentials. Need: TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET' };
  }

  let tweetText = text;
  if (tweetText.length > 280) tweetText = tweetText.substring(0, 277) + '...';

  const url = 'https://api.twitter.com/2/tweets';
  const body = JSON.stringify({ text: tweetText });
  
  const authHeader = createOAuthHeader('POST', url, { text: tweetText });

  const options = {
    hostname: 'api.twitter.com',
    path: '/2/tweets',
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    }
  };

  try {
    const result = await httpsRequest(options, body);
    if (result.status === 201) {
      console.log(`✅ Tweet posted: ${result.data.data.id}`);
      return { success: true, tweetId: result.data.data.id };
    } else {
      console.error(`❌ API Error (${result.status}):`, JSON.stringify(result.data));
      return { success: false, error: `HTTP ${result.status}: ${JSON.stringify(result.data)}` };
    }
  } catch (err) {
    console.error('❌ Request failed:', err.message);
    return { success: false, error: err.message };
  }
}

// ── Get via Bearer token (read-only, for testing) ──
async function testConnection() {
  if (!CREDS.bearerToken) {
    return { success: false, error: 'No BEARER_TOKEN set' };
  }
  const options = {
    hostname: 'api.twitter.com',
    path: '/2/users/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${CREDS.bearerToken}` },
  };
  try {
    const result = await httpsRequest(options);
    if (result.status === 200) {
      console.log(`✅ Connected as: @${result.data.data.username}`);
      return { success: true, user: result.data.data };
    }
    return { success: false, error: `HTTP ${result.status}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Main ──
async function main() {
  const args = process.argv.slice(2);

  console.log('═══════════════════════════════════════');
  console.log('  Devotion Tweet Bot');
  console.log('═══════════════════════════════════════\n');

  // Check credentials
  const hasCreds = CREDS.apiKey && CREDS.apiSecret;
  console.log(`Credentials: ${hasCreds ? '✅ API keys present' : '❌ Missing API keys'}`);
  console.log(`  OAuth 1.0a ready: ${CREDS.accessToken && CREDS.accessSecret ? '✅ Yes' : '❌ Need ACCESS_TOKEN and ACCESS_SECRET'}`);
  console.log(`  Bearer token: ${CREDS.bearerToken ? '✅ Present' : '❌ Missing'}\n`);

  if (args.includes('--test')) {
    console.log('Testing connection...');
    const result = await testConnection();
    if (result.success) {
      console.log(`✅ Authenticated as @${result.user.username} (ID: ${result.user.id})`);
    } else {
      console.log(`❌ Connection test failed: ${result.error}`);
    }
    return;
  }

  if (args.includes('--list')) {
    const queue = buildQueue();
    console.log(`📋 Queue status:`);
    console.log(`   Sent: ${queue.sent.length}`);
    console.log(`   Failed: ${queue.failed.length}`);
    console.log(`   Queued: ${queue.queued.length}\n`);
    if (queue.queued.length > 0) {
      console.log('Next tweets:');
      queue.queued.slice(0, 10).forEach((t, i) => {
        console.log(`  ${i+1}. Day ${t.day} ${t.time}: ${t.text.substring(0, 70).replace(/\n/g, ' ')}...`);
      });
    }
    return;
  }

  if (args.includes('--now')) {
    if (!CREDS.accessToken || !CREDS.accessSecret) {
      console.error('❌ Cannot post: OAuth 1.0a tokens not configured.');
      console.error('   Set TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_SECRET env vars.');
      process.exit(1);
    }
    const queue = buildQueue();
    if (queue.queued.length === 0) { console.log('No queued tweets.'); return; }
    const tweet = queue.queued[0];
    console.log(`Posting Day ${tweet.day} ${tweet.time}...\n`);
    console.log(`Text: ${tweet.text.substring(0, 100)}...\n`);
    const result = await postTweet(tweet.text);
    const q = loadQueue();
    const id = `${tweet.day}-${tweet.time}`;
    if (result.success) {
      q.sent.push({ id, day: tweet.day, time: tweet.time, tweetId: result.tweetId, postedAt: new Date().toISOString() });
      console.log(`✅ Posted! Tweet ID: ${result.tweetId}`);
    } else {
      q.failed.push({ id, day: tweet.day, time: tweet.time, error: result.error, attemptedAt: new Date().toISOString() });
    }
    q.queued = q.queued.filter(t => `${t.day}-${t.time}` !== id);
    saveQueue(q);
    return;
  }

  if (args.includes('--day')) {
    const idx = args.indexOf('--day');
    const dayNum = parseInt(args[idx + 1]);
    if (!dayNum) { console.error('Usage: node post_tweet.js --day <number>'); process.exit(1); }
    const queue = buildQueue();
    const dayTweets = queue.queued.filter(t => t.day === dayNum);
    if (dayTweets.length === 0) { console.log(`No unsent tweets for Day ${dayNum}`); return; }
    for (const tweet of dayTweets) {
      console.log(`Posting Day ${tweet.day} ${tweet.time}...`);
      const result = await postTweet(tweet.text);
      const q = loadQueue();
      const id = `${tweet.day}-${tweet.time}`;
      if (result.success) {
        q.sent.push({ id, day: tweet.day, time: tweet.time, tweetId: result.tweetId, postedAt: new Date().toISOString() });
        console.log(`✅ Posted!`);
      } else {
        q.failed.push({ id, day: tweet.day, time: tweet.time, error: result.error, attemptedAt: new Date().toISOString() });
        console.log(`❌ Failed: ${result.error}`);
      }
      q.queued = q.queued.filter(t => `${t.day}-${t.time}` !== id);
      saveQueue(q);
      await new Promise(r => setTimeout(r, 1000));
    }
    return;
  }

  if (args.includes('--all')) {
    const queue = buildQueue();
    if (queue.queued.length === 0) { console.log('All tweets already posted.'); return; }
    console.log(`Posting ${Math.min(queue.queued.length, 20)} tweets...`);
    for (const tweet of queue.queued.slice(0, 20)) {
      console.log(`\nDay ${tweet.day} ${tweet.time}: ${tweet.text.substring(0, 60)}...`);
      const result = await postTweet(tweet.text);
      const q = loadQueue();
      const id = `${tweet.day}-${tweet.time}`;
      if (result.success) {
        q.sent.push({ id, day: tweet.day, time: tweet.time, tweetId: result.tweetId, postedAt: new Date().toISOString() });
      } else {
        q.failed.push({ id, day: tweet.day, time: tweet.time, error: result.error, attemptedAt: new Date().toISOString() });
      }
      q.queued = q.queued.filter(t => `${t.day}-${t.time}` !== id);
      saveQueue(q);
      await new Promise(r => setTimeout(r, 1000));
    }
    console.log(`\nDone. Check queue with --list`);
    return;
  }

  // Default: status
  console.log('Usage:');
  console.log('  node post_tweet.js --list     Show tweet queue');
  console.log('  node post_tweet.js --now      Post next unsent tweet');
  console.log('  node post_tweet.js --day <N>  Post tweets for a day');
  console.log('  node post_tweet.js --all      Post all unsent tweets');
  console.log('  node post_tweet.js --test     Test API connection');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
