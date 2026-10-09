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

## 2026-10-09 — Native R19h2 presentation test milestone
- The QR Worker serves the actual frozen R19h2 presentation at `/presentation` and offers an unpaired visual preview at `/r19-preview`.
- Exact core R19h2 timeline/presentation source files were mirrored from `reference/prototype-free-final-r19h2-20261001` *into this QR-only branch*. The frozen branch was not changed.
- On phone QR claim, browser switches to the full native presentation. Desktop automatically switches to the same native presentation. No standalone remote-control screen in the paired flow.
- Connected phone shares the native timeline center timestamp through Cloudflare Durable Object. Desktop applies the selection with the native R19 runtime.
- This is still a demo: no new user account, D1/R2 paid-storage binding, authenticated personal media, automatic media-index syncing, or private-photo authorization. The Tell route is deliberately disabled in the QR Worker until the backend is connected securely.
- Test QR and presentation synchrony with iPhone Safari and desktop separately; successful GitHub commits alone do not establish Cloudflare deployment or device-level success.

## 2026-10-09 — Correct approved TV composition
- Approval reference found at `src/desktop-presentation.js` (approved TV presentation, 29 Sep 2026, already used in the historical main presentation composition).
- Keep ordinary native r19h2 presentation on iPhone; apply the exact approved large-screen TV CSS and classification script only to paired `role=player` browser.
- `/r19-preview` now deliberately previews that approved TV composition on a desktop without QR pairing.
- TV visual rules: full-bleed photography for landscape, top picture-overlaid timeline, story heading at lower center, no Listen prompt, share controls, ordinary navigation, or editor UI.
- The Durable Object session and QR scan/claim/confirmation workflow are unchanged by this update.

## 2026-10-09 — Experiment: verhaaltekst van telefoon naar TV
- Functionele bedoeling: telefoon blijft de gewone R19-presentatie met de natuurlijke verticale story swipe. Geen extra afstandsbediening.
- Bij een echte upward read swipe in `#memoryStoryScroll`: deel de leesstatus en genormaliseerde leespositie met de gekoppelde Cloudflare Durable Object-sessie. Kleine onbedoelde scrollbewegingen worden genegeerd.
- Op het gekoppelde grote scherm verschijnt links een lichte, rustige tekstkolom met dezelfde geselecteerde titel en verhaaltekst; de foto verschuift naar de rechterkant en blijft door `object-fit:contain` in haar geheel zichtbaar.
- De tv volgt verdere scrollbewegingen binnen de tekstkolom. Bij het sluiten van het tekstvlak op de telefoon verdwijnt de tv-tekstkolom en wordt het bestaande goedgekeurde, schermvullende tv-beeld hersteld.
- Gebruikers wijzigen de tekst uitsluitend op de telefoon. De tv leest de tekst uit de bestaande R19-presentatie op basis van dezelfde geselecteerde herinnering; de QR-sessie draagt hier alleen leesstatus/progressie, geen persoonlijke verhaalinhoud.
- Dit is een visuele en functionele proef, pas als goedgekeurd als iPhone+desktop de weergave en scrollpositie in de praktijk bevestigen. Verander het bevroren R19h2, Life Space of Business Filmstrip niet.
