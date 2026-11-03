-- Staging-only multipart upload tracking in the EXISTING TALERA D1.
-- No new workers/buckets; unfinished R2 multipart uploads expire after seven days.
-- The digest_kind column distinguishes SHA-256 of content from a verified part-root.
ALTER TABLE talera_premium_media ADD COLUMN digest_kind TEXT NOT NULL DEFAULT 'full-sha256';
CREATE TABLE IF NOT EXISTS talera_premium_uploads (
  account_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  upload_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  part_size INTEGER NOT NULL,
  part_count INTEGER NOT NULL,
  fingerprint TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(account_id,media_id),
  FOREIGN KEY(account_id) REFERENCES accounts(id)
);
CREATE TABLE IF NOT EXISTS talera_premium_upload_parts (
  account_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  part_number INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  etag TEXT NOT NULL,
  PRIMARY KEY(account_id,media_id,part_number),
  FOREIGN KEY(account_id,media_id) REFERENCES talera_premium_uploads(account_id,media_id)
);
