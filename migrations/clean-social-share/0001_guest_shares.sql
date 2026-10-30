-- TALERA: uitsluitend toepassen op een NIEUWE, GEISOLEERDE staging D1 na akkoord.
CREATE TABLE IF NOT EXISTS talera_guest_shares (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 owner_id TEXT NOT NULL,
 request_id TEXT NOT NULL,
 memory_id TEXT NOT NULL,
 story_id TEXT NOT NULL,
 token_hash TEXT NOT NULL UNIQUE,
 hours INTEGER NOT NULL CHECK(hours IN(1,24,168,720)),
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 revoked_at INTEGER,
 title TEXT NOT NULL,
 story_text TEXT NOT NULL,
 event_time_text TEXT,
 UNIQUE(owner_id,request_id)
);
CREATE INDEX IF NOT EXISTS idx_guest_owner_date ON talera_guest_shares(owner_id,created_at);
CREATE INDEX IF NOT EXISTS idx_guest_expiry ON talera_guest_shares(expires_at);
CREATE TABLE IF NOT EXISTS talera_guest_media (
 share_id INTEGER NOT NULL REFERENCES talera_guest_shares(id),
 media_id TEXT NOT NULL,
 object_key TEXT NOT NULL,
 mime_type TEXT NOT NULL,
 sort_order INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(share_id,media_id)
);
CREATE INDEX IF NOT EXISTS idx_guest_media_share ON talera_guest_media(share_id,sort_order);