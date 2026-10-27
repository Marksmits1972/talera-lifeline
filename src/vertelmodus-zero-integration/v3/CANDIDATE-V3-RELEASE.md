# TALERA PWA — V3 iPhone-reviewcorrecties, 27 oktober 2026

STATUS: CANDIDATE / BUILT / SYNTHETIC BROWSER TESTS PASSED / REAL iPHONE SAFARI NOT YET TESTED / OWNER APPROVAL PENDING. No promotion to CURRENT.

## Basis en veilige afzondering
- Unmodified functional V2 source Worker: talera-pwa-vertel-schrijf-v2-test, deployment 0a1fece2-a737-490b-9f3d-274aa71882e9, version 5e2bccaf-c176-44e4-97f8-86aad50fd60e.
- Unmodified zero-integration candidate: talera-pwa-vertelmodus-zero-integrated-test, deployment 5be1127d-b0cb-494c-8f4a-b1fe2801ae03.
- New separate V3 Worker: talera-pwa-werkblad-schrijf-v3-test.
- V3 URL: https://talera-pwa-werkblad-schrijf-v3-test.mark-a39.workers.dev/tell
- V3 presentation: https://talera-pwa-werkblad-schrijf-v3-test.mark-a39.workers.dev/present
- V3 Cloudflare deployment: 4d1e702e-4abd-4392-b3bc-6c52fecfd715
- V3 Cloudflare version: c3232a0c-9615-4cb1-8d8b-691a5e25d345
- Source branch: feature/werkblad-review-fixes-v3-20261027, branched from V2 branch without modifying it.

## Code changes
1. Single publication footer: at the VERY beginning of the existing TALERA_V4_HTML workView(), remove any direct #app > .submit before rendering a new workView. The original publish button/validations/persistence remain unchanged. This resolves multiplication after drag reorder.
2. Schrijven: after the writer overlay is appended inside existing taleraCompactWorkbench(g), append a compact 6-column photo/video strip using the existing g.media order, asset IDs, preview object URLs and video indicators. Do not create extra media or sorting logic. See v3/writer-photos-v3.js.
3. Editor style: six equal small thumbnails stay above the writing field; uncluttered light writing area; one Klaar button and existing concept text event/save. See v3/writer-style-v3.css. No date/title/publication controls in writer overlay.
4. Replay reset: replace only async play() in the approved zero-player closure, clearing previous original-video-round and manual frame state, disposing the last displayed media element and showing the INDEX FROM THE FIRST RECORDED CUE before starting voice.currentTime at zero. This applies on every playback, even after manually navigating or replaying. The original voice clock, stored cues, muted narration video and original-sound video round stay intact. See v3/player-start-v3.js.
5. Official TALERA icon: confirmed from Marksmits1972/talera-website/assets/brand-mark.png (Git blob f2a994eb1fe8dd06c9d2836a4485c3dcb05a9f00), visually matching user screenshots. The EXACT original brand-mark bytes are preserved in v3/original-brand-mark-website.base64; the V3 deployment rasterizes the mark on a white square at 180, 192 and 512 pixels with Cloudflare Browser Rendering, with no new or generated logo concept. Icon response routes: /talera-brand-v3-180.png, /talera-brand-v3-192.png, /talera-brand-v3-512.png, /apple-touch-icon.png. V3 app manifest, HTML apple-touch-icon/favicon and og:image link point to these new files. Old v19 logo is no longer referenced in the relevant V3 HTML head and manifest.
6. Health identifier changed to zero-integrated-candidate-v3.

## Automated browser checks (390×844 mobile viewport)
PASS: /, /tell, /present, /vertelmodus-embed?mode=present, /manifest.webmanifest, /vertelmodus-health and all three official icon PNG routes load without Worker exception.
PASS: two imported synthetic photos, three consecutive long-press/pointer drags => publish-button counts [1,1,1,1].
PASS: writer overlay shows all photos, original concept text updated and persists when closing; six synthetic photos => exactly six writer thumbnail images and one publish button.
PASS: mocked narrator with recorded first cue index 1 and manually selected image 2 => playback starts at index 1 (display 2/3) and repeats from index 1 on second play, with voice.currentTime 0.
PASS: synthetic ended narration plus two mock video blobs separated by one photo => unmuted original video indices 0 and 2 play in the correct order as video elements (DOM-level behavioral test).

## Owner iPhone review still required
Verify six photos and actual iPhone videos, repeated dragging (single publish button), writer thumbnail strip while software keyboard is visible, saving/reopening text, playback start and recording sync with real recorded voice, video decoder smoothness, complete final original-sound videos, native autoplay/user-gesture fallback, presentation gestures, returning to edit view, share sheet icon and PWA home screen icon (iOS may cache older icons), publishing and reopening a memory. Do not claim true microphone/sound/codec tests based on mocked browser events.

## Storage and release
Each distinct workers.dev URL has separate IndexedDB; existing personal stories from earlier origin do not automatically appear on V3. Avoid deleting the V2 or original worker and avoid clearing browser data. Roll back to V2 URL if needed. The original integrated 2026-10-27 PWA continues to be a large multipart Cloudflare Worker whose entire CI build is not yet reproducible solely from this GitHub branch; V3 source files document the precise deltas but not the historical complete bundle. Draft PR only; merge after explicit owner's acceptance, separate rebuild and regressions.
