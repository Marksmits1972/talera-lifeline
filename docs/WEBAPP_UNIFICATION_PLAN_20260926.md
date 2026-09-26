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
