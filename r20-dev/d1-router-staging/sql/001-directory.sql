-- Only for separate TALERA router STAGING directory database.
-- Never execute this file against any existing TALERA account or memory DB.
CREATE TABLE IF NOT EXISTS shards (
 shard_id TEXT PRIMARY KEY,
 state TEXT NOT NULL CHECK (state IN ('active','draining','disabled')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS account_shard (
 account_id TEXT PRIMARY KEY,
 shard_id TEXT NOT NULL REFERENCES shards(shard_id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS account_shard_by_shard ON account_shard(shard_id);
