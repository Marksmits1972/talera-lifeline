-- Private metadata for Free story and historical comment snapshots.
-- Staging: existing D1; no changes to Free or social tables.
CREATE TABLE IF NOT EXISTS talera_premium_records (
  account_id TEXT NOT NULL,
  record_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('story','comment_archive')),
  object_key TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK(byte_size>0 AND byte_size<=1048576),
  created_at INTEGER NOT NULL,
  PRIMARY KEY(account_id,record_id),
  FOREIGN KEY(account_id) REFERENCES accounts(id)
);
CREATE INDEX IF NOT EXISTS idx_talera_premium_records_account ON talera_premium_records(account_id,kind,created_at);
