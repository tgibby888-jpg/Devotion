#!/usr/bin/env node
// Devotion Tweet Bot — .cjs forces CommonJS mode for Railway
// (package.json has "type": "module" so .js files are ESM)

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_FILE = path.join(__dirname, 'tweet_queue.json');
const CALENDAR_FILE = path.join(__dirname, '..', 'content', '14-day-content-calendar.md');

const CREDS = {
  apiKey: process.env.TWITTER_API_KEY || '',
  apiSecret: process.env.TWITTER_API_SECRET || '',
  bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
  accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
  accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
};

function parseCalendar() {
  const content = fs.readFileSync(CALENDAR_FILE, 'utf-8');
  const tweets = [];
  let currentDay = null;
  let currentTime = null;
  let currentText = [];
  let inTweet = false;

  for (const line of content.split('\n')) {
    if (line.trim().startsWith('```')) { inTweet = !inTweet; continue; }
    if (inTweet && line.trim().startsWith('```')) { inTweet = false; continue; }

    const dayMatch = line.match(/^## Day (\d+)/);
    if (dayMatch) { currentDay = parseInt(dayMatch[1]); continue; }

    const t1 = line.match(/^### Tweet 1 \((\d+)(am|pm)/);
    const t2 = line.match(/^### Tweet 2 \((\d+)(am|pm)/);
    if (t1 || t2) {
      if (currentText.length > 0 && currentDay && currentTime) {
        tweets.push({ day: currentDay, time: currentTime, text: currentText.join('\n').trim() });
      }
      currentTime = t1 ? '10am' : '7pm';
      currentText = [];
      continue;
    }

    if (currentTime && currentDay) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('>') && !trimmed.startsWith('|') && !trimmed.startsWith('*')) {
        currentText.push(trimmed);
      } else if (trimmed === '' && currentText.length > 0) {
      }
      if (trimmed.startsWith('###') || trimmed.match(/^#{2,4}/)) {
        if (currentText.length > 0) {
          tweets.push({ day: currentDay, time: currentTime, text: currentText.join('\n').trim() });
        }
        currentTime = null;
        currentText = [];
      }
    }
  }

  if (currentText.length > 0 && currentDay && currentTime) {
    tweets.push({ day: currentDay, time: currentTime, text: currentText.join('\n').trim() });
  }

  return tweets.map(t => ({ ...t, text: t.text.replace(/\n{3,}/g, '\n\n').trim() }));
}

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

function createOAuthHeader(method, url, params = {}) {
  const oauth = {
    oauth_consumer_key: CREDS.apiKey,
    oauth_token: CREDS.accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000),
    oauth_nonce: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    oauth_version: '1.0',
  };
  const allParams = { ...params, ...oauth };
  const paramKeys = Object.keys(allParams).sort();
  const paramStr = paramKeys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(String(allParams[k]))}`).join('&');
  const sigBase = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`;
  const signingKey = `${encodeURIComponent(CREDS.apiSecret)}&${encodeURIComponent(CREDS.accessSecret)}`;
  const crypto = require('crypto');
  const signature = crypto.createHmac('sha1', signingKey).update(sigBase).digest('base64');
  oauth.oauth_signature = signature;
  return 'OAuth ' + Object.entries(oauth).map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(String(v))}"`).join(', ');
}

function httpsRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, data, headers: res.headers }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function postTweet(text) {
  if (!CREDS.apiKey || !CREDS.apiSecret || !CREDS.accessToken || !CREDS.accessSecret) {
    return { success: false, error: 'Missing OAuth 1.0a credentials' };
  }
  let tweetText = text;
  if (tweetText.length > 280) tweetText = tweetText.substring(0, 277) + '...';
  const url = 'https://api.twitter.com/2/tweets';
  const body = JSON.stringify({ text: tweetText });
  const authHeader = createOAuthHeader('POST', url, { text: tweetText });
  const options = { hostname: 'api.twitter.com', path: '/2/tweets', method: 'POST', headers: { 'Authorization': authHeader, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } };
  try {
    const result = await httpsRequest(options, body);
    if (result.status === 201) {
      console.log('✅ Tweet posted:', result.data.data.id);
      return { success: true, tweetId: result.data.data.id };
    } else {
      console.error('❌ API Error (' + result.status + '):', JSON.stringify(result.data));
      return { success: false, error: 'HTTP ' + result.status };
    }
  } catch (err) {
    console.error('❌ Request failed:', err.message);
    return { success: false, error: err.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  console.log('═══════════════════════════════════════');
  console.log('  Devotion Tweet Bot');
  console.log('═══════════════════════════════════════\n');

  const hasCreds = CREDS.apiKey && CREDS.apiSecret;
  console.log('Credentials: ' + (hasCreds ? '✅ API keys present' : '❌ Missing API keys'));
  console.log('  OAuth 1.0a ready: ' + (CREDS.accessToken && CREDS.accessSecret ? '✅ Yes' : '❌ No'));

  if (args.includes('--test')) {
    console.log('Testing connection...');
    return;
  }

  if (args.includes('--now')) {
    if (!CREDS.accessToken || !CREDS.accessSecret) {
      console.error('❌ Cannot post: OAuth 1.0a tokens not configured.');
      process.exit(1);
    }
    const queue = buildQueue();
    if (queue.queued.length === 0) { console.log('No queued tweets.'); return; }
    const tweet = queue.queued[0];
    console.log('Posting Day ' + tweet.day + ' ' + tweet.time + '...');
    const result = await postTweet(tweet.text);
    const q = loadQueue();
    const id = tweet.day + '-' + tweet.time;
    if (result.success) {
      q.sent.push({ id, day: tweet.day, time: tweet.time, tweetId: result.tweetId, postedAt: new Date().toISOString() });
      console.log('✅ Posted!');
    } else {
      q.failed.push({ id, day: tweet.day, time: tweet.time, error: result.error, attemptedAt: new Date().toISOString() });
      console.log('❌ Failed:', result.error);
    }
    q.queued = q.queued.filter(t => t.day + '-' + t.time !== id);
    saveQueue(q);
    return;
  }

  console.log('Usage: node post_tweet.cjs --now');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });