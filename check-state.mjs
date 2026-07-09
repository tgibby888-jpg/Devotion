#!/usr/bin/env node
// Check current state
import { $ } from "bun";

// Check DB tables
const tables = await $`team-db "SELECT name FROM sqlite_master WHERE type='table' AND name='waitlist'"`.quiet().text();
console.log("waitlist table:", tables.includes("waitlist") ? "EXISTS" : "MISSING");

// Check site
const resp = await fetch("http://localhost:3000").catch(() => null);
console.log("site status:", resp?.status || "DOWN");

if (resp) {
  const text = await resp.text();
  console.log("has waitlist form:", text.includes("Join waitlist"));
  console.log("has coming soon:", text.includes("Coming soon"));
}

// Check tasks
const tasks = await $`team-db "SELECT id, title, status FROM tasks WHERE assigned_to='agent-full-stack-engineer'"`.quiet().text();
console.log("tasks:", tasks);