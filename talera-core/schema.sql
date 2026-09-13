PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS core_stories (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT,
  title TEXT NOT NULL,
  event_time_text TEXT NOT NULL,
  event_at TEXT NOT NULL,
  event_time_precision TEXT NOT NULL DEFAULT 'unknown',
  story_text TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_core_stories_event_at ON core_stories(event_at);
CREATE INDEX IF NOT EXISTS idx_core_stories_owner ON core_stories(owner_user_id, status);

CREATE TABLE IF NOT EXISTS core_story_capabilities (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  scope TEXT NOT NULL CHECK(scope IN ('owner','reader')),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY(story_id) REFERENCES core_stories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_core_capabilities_story ON core_story_capabilities(story_id, revoked_at);

CREATE TABLE IF NOT EXISTS core_story_audio (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK(size_bytes > 0),
  sha256 TEXT NOT NULL,
  duration_seconds REAL,
  is_current INTEGER NOT NULL DEFAULT 1 CHECK(is_current IN (0,1)),
  created_at TEXT NOT NULL,
  superseded_at TEXT,
  FOREIGN KEY(story_id) REFERENCES core_stories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_core_audio_story_current ON core_story_audio(story_id, is_current);

CREATE TABLE IF NOT EXISTS core_story_media (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'extra',
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK(size_bytes > 0),
  sha256 TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY(story_id) REFERENCES core_stories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_core_media_story_order ON core_story_media(story_id, sort_order, created_at);

-- Future account layer. Deliberately separate from temporary capability tokens.
CREATE TABLE IF NOT EXISTS core_users (
  id TEXT PRIMARY KEY,
  email_hash TEXT UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS core_story_grants (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK(permission IN ('read','contribute','edit')),
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY(story_id) REFERENCES core_stories(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES core_users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_core_story_grants_unique ON core_story_grants(story_id, user_id, permission);
