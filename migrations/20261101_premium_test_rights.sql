-- TALERA Premium test rights, additive-only migration in existing core D1.
-- No billing, no customer media upload, no privileged operator implicitly created.
CREATE TABLE IF NOT EXISTS talera_premium_admins(
 account_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(id),
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 provisioned_at INTEGER NOT NULL,
 provisioned_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS talera_premium_test_grants(
 account_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(id),
 plan_code TEXT NOT NULL CHECK(plan_code IN ('individual','family_light','family','family_heavy')),
 expires_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 updated_by TEXT NOT NULL REFERENCES accounts(id)
);
CREATE INDEX IF NOT EXISTS idx_talera_test_grants_expires ON talera_premium_test_grants(expires_at);
CREATE TABLE IF NOT EXISTS talera_premium_test_audit(
 id TEXT PRIMARY KEY NOT NULL,
 actor_account_id TEXT NOT NULL REFERENCES accounts(id),
 target_account_id TEXT NOT NULL REFERENCES accounts(id),
 action TEXT NOT NULL CHECK(action IN ('grant','revoke')),
 previous_plan TEXT NOT NULL,
 new_plan TEXT NOT NULL,
 expires_at INTEGER,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_talera_test_audit_target ON talera_premium_test_audit(target_account_id,created_at DESC);
