# TALERA — Candidate V2 | bewerken, schrijven, videogeluid

STATUS: BUILT / BROWSER TESTED / NOT IPHONE TESTED / OWNER APPROVAL PENDING. Date: 27 October 2026.

## Frozen original
Repository Marksmits1972/talera-lifeline; base branch feature/vertelmodus-zero-pwa-integration-20261027.
Unmodified base Worker talera-pwa-vertelmodus-zero-integrated-test.
Original deployment 5be1127d-b0cb-494c-8f4a-b1fe2801ae03; Cloudflare version bcf5b74b-2e9a-4929-8712-f38a1ec9f50a.

## New candidate
Branch feature/werkblad-schrijf-videoronde-20261027.
Worker talera-pwa-vertel-schrijf-v2-test.
Workbench: https://talera-pwa-vertel-schrijf-v2-test.mark-a39.workers.dev/tell
Presentation: https://talera-pwa-vertel-schrijf-v2-test.mark-a39.workers.dev/present
Embedded player: https://talera-pwa-vertel-schrijf-v2-test.mark-a39.workers.dev/vertelmodus-embed?mode=present
Deployment 0a1fece2-a737-490b-9f3d-274aa71882e9; Cloudflare version 5e2bccaf-c176-44e4-97f8-86aad50fd60e.

## Scope and technical injection anchors
The original PWA page TALERA_V4_HTML still owns title/date, media IDs, voice cues, storage and publication.
workbench-candidate.js is injected into the existing /tell closure before function setupV10. It is called after setupV10 from workView. CSS comes from workbench-candidate.css. It reuses the SAME tileHtml, enableDrag and movePhoto helpers already present in the overview. movePhoto now redraws workView if that is the active view. Do not add a second media database or drag engine. The old large preview frame remains internally for date validation but is visually hidden. Compact tiles appear below title/date and before the two buttons.

The writer overlay keeps #story as canonical input, synchronises via the original input event, and saves into the existing concept. Closing returns to the edit page; it does not publish.

video-replay-candidate.js is inserted INSIDE the approved standalone zero-player closure immediately before its voice-ended listener. The listener runs taleraStartOriginalRound on present mode. Videos from the original memory are replayed from the beginning in memory order unmuted after narration has ended. No voice -> direct plain video with sound when the browser allows; otherwise native play control. iOS autoplay fallback is one on-video play button if policy rejects playback.

neighbor-candidate.js is inserted inside the local RH19 presentation adapter, with NEXT_STORY message dispatch from the embedded zero-player; no old Story Player timers are restored.

performance-candidate.js describes surgical decoder/seek changes. The previous video is paused and its src cleared on disposal, with a load() reset to free the decoder. syncVideo avoids repeated seeks while already seeking, without replacing the voice.currentTime clock or saved cues.

INTEGRATION TRAP: taleraV20TagsInTell patches the workView source at the token setupV10(g,details,frame,footer);if(errorMsg). The V2 bundled worker V20 patch search AND replacement were updated to include taleraCompactWorkbench(g) after setupV10. An initial failed test was fixed; the final deployment has no diagnostic stack-trace handler.

## Browser tests
Cloudflare Browser Rendering with mobile viewport 390×844: all five routes /, /tell, /present, /vertelmodus-embed?mode=present, /vertelmodus-health rendered without Worker error.
Two synthetic photos imported -> two compact square tiles appear. Synthetic long press + pointer move reordered them (IDs actually swapped).
Schrijven overlay opened, input propagated into original story field, and closed without losing the text.
Synthetic voice-ended event plus two mock video blobs -> video 0, then video 2; both media elements were unmuted. THIS IS AN EVENT AND DOM TEST, NOT REAL CODEC PLAYBACK OR IPHONE SOUND VALIDATION.

## Acceptance remaining on iPhone
Import two genuine iPhone videos and photos; reorder, write, close; record voice across still and moving media; verify muted videos while voice plays; publish and reopen; after voice ends watch both full original videos with sound; test no-voice direct video, tap next image, swipe next story, playback stalls, Safari autoplay fallback, return from recorder to edit page and PWA regression.

## Rollback / status
Do NOT change CURRENT or original Worker, and do not merge until the owner approves. The new workers.dev origin has independent IndexedDB, so memories on another Worker origin do not automatically appear. Do not clear old browser data. Original Worker and all earlier candidate deployments remain rollback options.

## Reproducibility limitation
The complete October 27 PWA bundle was assembled on Cloudflare from an older Worker plus the independent zero-player and is not yet reproducibly built from GitHub. Source fragments in this branch describe the exact delta; final CI consolidation is still required before production. Do NOT claim this branch alone builds the entire PWA.
