import assert from 'node:assert/strict';
// Read-only test: no credentials, grants, uploads, or configuration writes.
// Set TALERA_CORE_STAGING_URL explicitly to run against the known staging host.
const base = process.env.TALERA_CORE_STAGING_URL;
if (!base) { console.log('SKIP: TALERA_CORE_STAGING_URL not set'); process.exit(0); }
const url = new URL('/api/me/premium/cloud/pilot', base);
assert.equal(url.protocol, 'https:', 'HTTPS is required');
const response = await fetch(url, {method:'GET', redirect:'manual', headers:{accept:'application/json'}});
assert.equal(response.status, 401, 'Anonymous users must be denied access');
console.log('PASS: anonymous Premium cloud pilot access denied');
