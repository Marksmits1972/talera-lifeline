-- Only for a new synthetic TALERA router shard database.
-- Real stories, media, accounts, auth and Premium are NOT stored here.
CREATE TABLE IF NOT EXISTS demo_stories (
 account_id TEXT NOT NULL,
 story_id TEXT NOT NULL,
 body_text TEXT NOT NULL CHECK (length(body_text) BETWEEN 1 AND 1000),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (account_id, story_id)
);
CREATE INDEX IF NOT EXISTS demo_stories_account ON demo_stories(account_id);
