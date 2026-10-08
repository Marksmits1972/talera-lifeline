# TALERA QR server-pairing — isolated experiment
Status: implementation preparation, 2026-10-08.

## Source and boundaries
Based on existing server-backed main branch (xxory-test uses Cloudflare D1 and R2). This branch is isolated; never change main, reference/prototype-free-final-r19h2-20261001, experiment/business-filmstrip-r19h2, or freeze/life-space-definitief-20261008 without explicit approval.

## Product contract
- iPhone remains the full existing TALERA presentation. No separate remote-control screen.
- A large-screen TALERA Player starts a server-backed pairing session and displays a time-limited QR containing a short claim link.
- The iPhone opens that link, identifies the target screen, and explicitly confirms.
- Server authorizes the paired phone; large screen gets media DIRECTLY from the service (not casting/Bluetooth).
- Same story/media ID and presentation position are shared as a session state. Commands are limited, authorized, idempotent where appropriate, ordered and authenticated.
- Never expose a library or private media solely because a QR token was seen.
- Expired, replayed, or revoked QR tokens cannot claim a session; display reconnection/expiration states.
- Client/server store transitions are explicit. Include manual disconnect and clean session expiration.
- First test: desktop browser as large screen + iPhone Safari, using safe demo content. Later add account permissions and paid cloud storage.
- Cloudflare components and real bindings must be verified before deployment, not guessed. Existing xxory-test D1/R2 setup is a starting point, not proof of production-ready paid storage.

## Milestones
1. Verify actual Worker routes, D1 schema, R2 media authorization, Cloudflare deploy ownership and environment credentials.
2. Server pairing session state machine (pending, claimed, approved, connected, expired, revoked), replay-safe one-time claim with separate capability scopes for Player and phone.
3. Full-screen Player QR view with refresh and clear errors.
4. Embedded QR flow opening the ORIGINAL phone presentation, not a new remote.
5. Two-way synchronization and direct media retrieval with ACL checks.
6. iPhone + desktop integration and failure-mode tests.

## Cloudflare GitHub deployment (confirmed 2026-10-08)
Worker: talera-qr-test; production branch: experiment/qr-server-pairing-20261008; root directory: /; deploy command: npx wrangler deploy --config experiments/qr-server-pairing/wrangler.jsonc. First deployment only serves a harmless bootstrap page and /health; no D1/R2 bindings yet.
