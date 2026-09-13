# TALERA Core v1

This directory is the clean backend foundation for TALERA. It is deliberately isolated from the currently working Tell, Timeline and Audio Lab Workers until the new core is proven.

## Why this exists

The current prototype grew through several generations of UI and API integration. TALERA Core starts from one stable domain model and one versioned API so the web prototype, future native app, listening mode and account system can use the same backend.

## Rules

1. Existing TALERA Workers remain untouched while Core is built and verified.
2. Audio storage uses the exact-byte proof pattern validated in Audio Lab v2: local/upload bytes -> SHA-256 -> R2 `head()` confirmation -> database link.
3. Reading/listening and editing do not share one all-powerful token. Transitional beta access uses separate `reader` and `owner` capabilities. Account sessions will replace these tokens later without changing story/audio tables.
4. The Core API is versioned under `/api/v1`.
5. `owner_user_id`, `core_users` and `core_story_grants` reserve the clean path to real accounts/admin without coupling the current beta to a specific identity provider.
6. No deployment from this directory may point at the existing production D1/R2 resources. Create dedicated `talera-core` resources first.

## Implemented in foundation 1

- `POST /api/v1/stories` creates a story and issues separate owner + reader capabilities.
- `GET /api/v1/stories/:id` requires owner or reader access.
- `PATCH /api/v1/stories/:id` requires owner access.
- `POST /api/v1/stories/:id/audio` requires owner access and stores audio using exact byte + SHA-256 verification.
- `GET|HEAD /api/v1/stories/:id/audio` accepts owner or reader access.
- D1 schema already contains the account/grant tables that later replace capability-only beta access.

## Deliberately not implemented yet

- login/session provider
- administrator endpoints
- invitation flows
- media upload API
- migration of existing prototype stories
- Timeline/Workblad integration

Those come after the Core Worker has its own D1/R2 resources and passes its isolated API tests.

## Local checks

```bash
cd talera-core
npm test
```

The checked-in Wrangler file is an example only. Copy it to `wrangler.jsonc` after dedicated Cloudflare resources exist. Do not reuse the current `xxory-test` D1 or media bucket.
