-- Versioned staging-only D1 migration. Never run on actual TALERA data.
CREATE TABLE IF NOT EXISTS capacity_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 shard_id TEXT NOT NULL,
 action TEXT NOT NULL CHECK (action IN ('activate','observe','blocked')),
 source TEXT NOT NULL DEFAULT 'github-analytics',
 reason TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS capacity_events_created_at ON capacity_events(created_at);
