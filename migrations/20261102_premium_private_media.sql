-- TALERA Premium private media manifest — staging only; apply after review.
-- Separate from social/WhatsApp media; no Free content migration.
CREATE TABLE IF NOT EXISTS talera_premium_media (
 account_id TEXT NOT NULL,
 media_id TEXT NOT NULL,
 object_key TEXT NOT NULL UNIQUE,
 content_type TEXT NOT NULL,
 byte_size INTEGER NOT NULL CHECK (byte_size>0),
 sha256 TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(account_id,media_id),
 FOREIGN KEY(account_id) REFERENCES accounts(id)
);
CREATE INDEX IF NOT EXISTS idx_talera_premium_media_account ON talera_premium_media(account_id,created_at);
