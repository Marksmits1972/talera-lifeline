# TALERA webapp unification — build plan — 2026-09-26

## Status

Active implementation plan for branch `webapp-unification-20260926`.

The existing TALERA code is the baseline. The goal is not a rewrite from zero. Working timeline, StoryLab/tell flows, media handling, handoff behavior, sharing, audio and presentation code are retained where they still fit the current product rules.

## Product architecture

One TALERA platform with shared accounts, memories, media and rights, exposed through three responsive surfaces:

1. **Phone webapp** — create, tell, import, edit, save, share and account actions.
2. **Desktop webapp** — browse timeline, inspect memories and present with more visual space.
3. **TALERA Player** — fullscreen large-screen presentation, paired to a phone through a temporary secure session.

Shared links remain browser-first and must open without install or account.

## Existing code to preserve and migrate

- timeline and presentation behavior under `src/`
- StoryLab clean tell experience under `xxory-test/src/storylab-clean*`
- story publishing and target-first timeline handoff
- R2 media storage and D1 story metadata
- photo/video/audio processing that has already passed regression tests
- sharing/recipient experience and preview generation
- iPhone/Safari-specific interaction fixes that are already validated

## Migration strategy

### Phase 0 — protect the working baseline

All unification work starts on a feature branch. Main remains the current production baseline until the unified flow is accepted.

### Phase 1 — shared routing and large-screen foundation

- add `/tv` TALERA Player route
- add secure temporary TV sessions
- add QR phone pairing
- add phone-to-player command channel
- test on desktop as if desktop were the TV
- later run the same `/tv` page on the HDMI stick

### Phase 2 — one memory model and same-origin flow

Replace cross-worker assumptions step by step so StoryLab, timeline, sharing and Player can run from one TALERA origin. Existing story IDs and media stay reusable.

### Phase 3 — responsive phone + desktop shell

Keep phone creation UX as the primary editor. Expand timeline/presentation layouts for desktop without creating a separate desktop product.

### Phase 4 — account boundary

Browsing and trying remain possible before account creation. Saving persistent personal work requires an account. Payment remains separate from account creation.

### Phase 5 — guided photo import

Add browser-native multi-photo import, chronological placement, progress by period and server-side de-duplication. Keep import limits configurable.

### Phase 6 — Free / Plus / Family entitlements

Implement entitlement flags and quotas as configuration, not hard-coded commercial promises. Family uses separate identities under one subscription.

### Phase 7 — PWA and direct shared-entry experience

Add installable webapp metadata/service worker where useful, while keeping all shared links directly usable in the browser.

### Phase 8 — production hardening

Backup/restore, export, security review, analytics, billing integration, support tooling and release gates.

## TALERA Player foundation

The Player is software first, hardware second.

Current route:

`/tv`

Target flow:

TV/desktop opens Player → temporary session created → QR appears → phone scans → phone is paired → phone sends presentation commands → Player renders the selected TALERA content.

The future HDMI stick does not need different TALERA software. It only needs to boot reliably, connect to Wi-Fi and open the same `/tv` Player fullscreen.

## Security baseline for TV sessions

- raw pairing/player/controller secrets are not stored in D1
- only SHA-256 hashes are persisted
- sessions expire automatically
- controller commands require the paired controller token
- player state reads require a player or controller token
- pairing URLs are temporary and scoped to one TV session

Account identity is intentionally not attached to the first Player foundation yet; it will be added when the unified account layer is built.

## Acceptance rule

Visible changes are not considered a new TALERA baseline until:

PLAN/SCOPE → BUILD → INTERNAL TEST → GREEN → REAL MOBILE/SAFARI USER CHECK → APPROVAL → BASELINE.

The same rule applies to desktop and TV Player flows, with desktop used first as the TV simulator.


## Implementation status — 27 september 2026

Phase 2 and phase 3 are now implemented on the feature branch as an internal test foundation.

### Phase 2 implemented

- the existing timeline is mounted at `/timeline` inside the same TALERA Worker as the tell environment
- the existing tell/edit experience is reachable at `/tell`
- StoryLab Clean publish handoff now returns to `/timeline` on the current origin instead of the old external timeline Worker
- V9 publish/edit handoff uses the same-origin `/timeline` route
- timeline private-memory reads through `/api/linked/*` are translated locally to the existing `/api/integration/*` story API
- the existing D1 story rows and R2 media remain the memory source; no duplicate desktop memory store has been introduced
- share-preview traffic can be served from the same Worker, with generated timeline share links rewritten to the unified `/timeline` route

### Phase 3 implemented

- `/app` provides a responsive test entry point for the combined TALERA webapp
- `/timeline` keeps the existing phone behavior and receives a wider desktop presentation layout at larger breakpoints
- `/tell` keeps the phone-primary creation model while remaining usable and centered on desktop
- navigation from the unified timeline to create/edit uses the same-origin `/tell` route
- `/tv` remains the dedicated large-screen Player surface built in phase 1
- `/api/webapp/revision` reports the current phase 2/3 capabilities for deployment verification

### Still deliberately pending

- Cloudflare preview deployment and binding verification
- real desktop walkthrough by the product owner
- real iPhone/Safari acceptance after the unified deployment is reachable
- any merge to `main` or production cutover

Those pending items are acceptance/deployment gates, not missing product architecture.
