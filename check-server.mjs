#!/usr/bin/env node
const http = require('http');
http.get('http://localhost:3000', (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const hasWaitlist = data.includes('Join waitlist');
    console.log('Has waitlist form:', hasWaitlist);
    console.log('Has Coming soon:', data.includes('Coming soon'));
  });
}).on('error', (e) => {
  console.log('Error:', e.message);
});