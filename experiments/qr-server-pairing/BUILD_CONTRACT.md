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

## Uitvoering — stap 1: echte presentatiecursor, zonder live wijzigingen

Werkbranch: `feature/qr-real-presentation-bridge-20261008`, vertakt vanaf de op iPhone en desktop werkende QR-testbranch `experiment/qr-server-pairing-20261008`. **Niet** in de Cloudflare productiebranch mergen zonder afzonderlijke iPhone/desktop-acceptatie.

Gebouwd:
- Geauthenticeerde `POST /api/presentation` voor de gekoppelde telefoon, met dezelfde QR/Durable Object-sessie. De TV mag de presentatie lezen via de bestaande `GET /api/state/:id`, niet schrijven.
- Presentatiecursor `{storyId,timestampMs,mediaIndex,mode,playback,revision}` zonder titels, verhalentekst, bestanden, media-URLs of beheertokens.
- Oplopend `seq` per telefoonsessie voorkomt terugloop door oude, vertraagde opdrachten en maakt herhaalde requests idempotent.
- Uitloggen/verbreken wist de presentatiecursor. Bestaande vier demo-items en navigatiecommando's zijn onaangetast.
- Automatische tests voor tokenrechten, éénmalige QR-claim, herhaalde/vertraagde commando's, afkeuring van ongeldige data en schoon verbreken.

**Nog niet gerealiseerd** (dus niet presenteren als echte end-to-end foto/video-integratie):
1. Na het scannen de *bestaande* TALERA-presentatie op de telefoon openen in plaats van de aparte vier-foto-remote. Geen tweede mobiel UX-ontwerp.
2. De bestaande TALERA-runtime laten publiceren naar de geauthenticeerde presentatiecursor; de originele swipe/tijdlijnmotor blijft eigenaar van navigatie.
3. De groot-scherm-Player laten renderen met het vastgezette fullscreen foto/tijdlijn-ontwerp, inclusief video, tekst, verhaal-audio en pauzeren/hervatten. Behouden uit `src/desktop-presentation.js`; de definitieve visuele referentie van 8 september blijft uitgangspunt.
4. D1/R2/private-media-autorisatie verbinden zodat een TV een werkelijk **toegestane** herinnering rechtstreeks ophaalt zonder beheertokens naar het scherm te sturen. Een QR-claim op zichzelf mag NOOIT toegang tot een privébibliotheek geven. Geen demo-media als vervanging voor echte data zonder duidelijk testlabel.
5. Same-origin/integratie met bestaande `/timeline`, `/tell` en story-ID-flow testen, met de bestaande webapp-unificatietak als bron maar zonder die blind naar productie te mergen.
6. Tests op echte iPhone Safari + desktop voor: chronologische selectie, meerdere foto's, geschreven verhaal, opgenomen audio, video, tekstweergave, navigatie, zeer snel swipen, verbreken, opnieuw koppelen, expiratie, schermvergrendeling en toegangsrechten.

**Visuele bronnen:** `TALERA_PRESENTATIESCHERM_REFERENCE_CURRENT_20260908` (vastgezet, foto-architectuur) en latere grote-schermrichtlijnen in TALERA's masterdocument. De exacte QR-startscherm-referentieafbeelding was nog niet definitief aangewezen; de bestaande werkende QR-start wordt daarom voorlopig bewaard in plaats van opnieuw ontworpen.

**Gate:** broncode op featurebranch → automatische tests → gecontroleerde preview-Worker (niet de huidige QR-test-URL) → iPhone/desktop-acceptatie → pas na akkoord merge/deploy.
