-- BB63 Gate 2 — minimal current-pointer metadata in EXISTING Premium D1.
-- No legacy test-data migration and no deletion of immutable R2 objects.
-- Review-only: never run against live D1 until matching server routes are ready.
CREATE TABLE IF NOT EXISTS talera_premium_current (
 account_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('media','story','comment_archive')),
 source_key TEXT NOT NULL CHECK(length(source_key)>0 AND length(source_key)<=1024),
 current_id TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision>0),
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(account_id,kind,source_key),
 FOREIGN KEY(account_id) REFERENCES accounts(id)
);
CREATE INDEX IF NOT EXISTS idx_talera_premium_current_account
 ON talera_premium_current(account_id,kind);
