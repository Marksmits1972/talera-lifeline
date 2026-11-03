-- Restore mapping for Free's original per-file IndexedDB key.
-- Same existing D1 tables and EU private bucket; nullable for old staging fixtures.
ALTER TABLE talera_premium_media ADD COLUMN source_key TEXT;
ALTER TABLE talera_premium_uploads ADD COLUMN source_key TEXT;
