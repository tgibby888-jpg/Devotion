#!/usr/bin/env node
// Devotion Tweet Bot v2 — Uses twitter-api-v2 library for reliable OAuth
const fs = require('fs');
const path = require('path');
const { TwitterApi } = require('twitter-api-v2');

const DATA_FILE = path.join(__dirname, 'tweet_queue.json');
const CALENDAR_FILE = path.join(__dirname, '..', 'content', '14-day-content-calendar.md');

const CREDS = {
  apiKey: process.env.TWITTER_API_KEY || '',
  apiSecret: process.env.TWITTER_API_SECRET || '',
  accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
  accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
};

function parseCalendar() {
  const content = fs.readFileSync(CALENDAR_FILE, 'utf-8');
  const tweets = [];
  let currentDay = null, currentTime = null, currentText = [], inTweet = false;
  for (const line of content.split('\n')) {
    if (line.trim().startsWith('```')) { inTweet = !inTweet; continue; }
    const dayMatch = line.match(/^## Day (\d+)/);
    if (dayMatch) { currentDay = parseInt(dayMatch[1]); continue; }
    const t1 = line.match(/^### Tweet 1 \((\d+)(am|pm)/);
    const t2 = line.match(/^### Tweet 2 \((\d+)(am|pm)/);
    if (t1 || t2) {
      if (currentText.length > 0 && currentDay && currentTime) tweets.push({ day: currentDay, time: currentTime, text: currentText.join('\n').trim() });
      currentTime = t1 ? '10am' : '7pm';
      currentText = [];
      continue;
    }
    if (currentTime && currentDay) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('>') && !trimmed.startsWith('|') && !trimmed.startsWith('*')) currentText.push(trimmed);
      if (trimmed.startsWith('###') || trimmed.match(/^#{2,4}/)) {
        if (currentText.length > 0) tweets.push({ day: currentDay, time: currentTime, text: currentText.join('\n').trim() });
        currentTime = null; currentText = [];
      }
    }
  }
  if (currentText.length > 0 && currentDay && currentTime) tweets.push({ day: currentDay, time: currentTime, text: currentText.join('\n').trim() });
  return tweets.map(t => ({ ...t, text: t.text.replace(/\n{3,}/g, '\n\n').trim() }));
}

function loadQueue() {
  try { if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch {}
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

async function postTweet(text) {
  const client = new TwitterApi({
    appKey: CREDS.apiKey,
    appSecret: CREDS.apiSecret,
    accessToken: CREDS.accessToken,
    accessSecret: CREDS.accessSecret,
  });
  let tweetText = text;
  if (tweetText.length > 280) tweetText = tweetText.substring(0, 277) + '...';
  try {
    const result = await client.v2.tweet(tweetText);
    console.log('✅ Tweet posted:', result.data.id);
    return { success: true, tweetId: result.data.id };
  } catch (err) {
    console.error('❌ API Error:', err.message || err);
    if (err.code) console.error('   Code:', err.code);
    if (err.data) console.error('   Data:', JSON.stringify(err.data));
    return { success: false, error: err.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const missing = [];
  if (!CREDS.apiKey) missing.push('TWITTER_API_KEY');
  if (!CREDS.apiSecret) missing.push('TWITTER_API_SECRET');
  if (!CREDS.accessToken) missing.push('TWITTER_ACCESS_TOKEN');
  if (!CREDS.accessSecret) missing.push('TWITTER_ACCESS_SECRET');

  if (missing.length > 0) {
    console.error('❌ Missing credentials:', missing.join(', '));
    process.exit(1);
  }

  if (args.includes('--test')) {
    console.log('Testing connection...');
    try {
      const client = new TwitterApi({ appKey: CREDS.apiKey, appSecret: CREDS.apiSecret, accessToken: CREDS.accessToken, accessSecret: CREDS.accessSecret });
      const me = await client.v2.me();
      console.log('✅ Connected as @' + me.data.username);
    } catch (err) {
      console.error('❌ Connection failed:', err.message);
    }
    return;
  }

  if (args.includes('--now')) {
    const queue = buildQueue();
    if (queue.queued.length === 0) { console.log('No queued tweets.'); return; }
    const tweet = queue.queued[0];
    console.log('Posting Day ' + tweet.day + ' ' + tweet.time + '...');
    const result = await postTweet(tweet.text);
    const q = loadQueue();
    const id = tweet.day + '-' + tweet.time;
    if (result.success) {
      q.sent.push({ id, day: tweet.day, time: tweet.time, tweetId: result.tweetId, postedAt: new Date().toISOString() });
    } else {
      q.failed.push({ id, day: tweet.day, time: tweet.time, error: result.error, attemptedAt: new Date().toISOString() });
    }
    q.queued = q.queued.filter(t => t.day + '-' + t.time !== id);
    saveQueue(q);
    return;
  }

  console.log('Usage: node post_tweet.cjs --test | --now');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });