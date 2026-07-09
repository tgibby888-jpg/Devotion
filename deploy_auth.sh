#!/usr/bin/env bash
cd /home/team/shared/site
# Create auth_tokens table
team-db "CREATE TABLE IF NOT EXISTS auth_tokens (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), token TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL DEFAULT (datetime('now', '+7 days')), created_at TEXT NOT NULL DEFAULT (datetime('now')))"
echo "AUTH_TOKENS_TABLE: $?"
# Build and publish
bash ./publish.sh > /tmp/auth_publish.txt 2>&1
echo "PUBLISH_DONE: $?" >> /tmp/auth_publish.txt