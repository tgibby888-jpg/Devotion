CREATE TABLE IF NOT EXISTS auth_tokens (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  token TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL DEFAULT (datetime('now', '+7 days')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);