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
6. No deployment from this directory may point at the existing TALERA D1/R2 resources. Core uses its own `DB` and `MEDIA` bindings.

## Implemented in foundation 1

- `POST /api/v1/stories` creates a story and issues separate owner + reader capabilities.
- `GET /api/v1/stories/:id` requires owner or reader access.
- `PATCH /api/v1/stories/:id` requires owner access.
- `POST /api/v1/stories/:id/audio` requires owner access and stores audio using exact byte + SHA-256 verification.
- `GET|HEAD /api/v1/stories/:id/audio` accepts owner or reader access.
- D1 schema already contains the account/grant tables that later replace capability-only beta access.
- The Worker bootstraps the Core schema with idempotent `CREATE IF NOT EXISTS` statements.
- `/` serves an isolated iPhone test surface for health, story creation, reader-vs-owner permissions, MediaRecorder pause/resume, exact-byte audio upload, retrieval, SHA-256 comparison and server playback.

## Cloudflare deployment

`talera-core/wrangler.jsonc` deliberately declares only fresh `DB` and `MEDIA` bindings. With current Wrangler automatic resource provisioning enabled, deploying this config creates/links isolated D1 and R2 resources for Core instead of touching the existing TALERA resources.

Cloudflare Git deploy command:

```bash
npx wrangler deploy
```

Cloudflare project root directory:

```text
talera-core
```

After a successful deploy, open the resulting `talera-core.<account>.workers.dev` URL on the iPhone. The first health request initializes the Core schema.

## iPhone acceptance sequence

A Core round is green when the test surface shows 6/6:

1. Core + D1 + R2 reachable.
2. Story created safely.
3. Reader capability can read.
4. Reader capability is blocked from editing.
5. Audio is attached after exact server-side byte/hash verification.
6. Retrieved server audio has exactly the same bytes and SHA-256 as the local iPhone recording and plays back correctly.

The microphone is requested only when `Start opname` is pressed.

## Deliberately not implemented yet

- login/session provider
- administrator endpoints
- invitation flows
- media upload API
- migration of existing prototype stories
- Timeline/Workblad integration

Those come after the isolated Core test is green on the real iPhone.

## Local checks

```bash
cd talera-core
npm test
```

Deployment trigger: production branch `feature/clean-core-v1-20260913` confirmed for the isolated Core Worker on 2026-09-13.
