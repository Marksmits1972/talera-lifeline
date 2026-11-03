-- One consent per existing TALERA account. No new account authority.
CREATE TABLE IF NOT EXISTS talera_premium_cloud_consent (
 account_id TEXT PRIMARY KEY,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 granted_at INTEGER,
 updated_at INTEGER NOT NULL,
 FOREIGN KEY(account_id) REFERENCES accounts(id)
);
