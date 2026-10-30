# TALERA – Account, herinnering, berichten en WhatsApp: verificatie 30 oktober 2026

## Productregel
De gebruiker ziet uitsluitend TALERA. Cloudflare is een onzichtbare hosting-, opslag- en beveiligingsprovider. Geen Cloudflare Access-scherm voor delen of bekijken. Een WhatsApp-uitnodiging draagt een willekeurige geheime code, geen account-ID, en mag uitsluitend één herinnering tonen tot het gekozen vervalmoment. De geheime link kan meerdere keren gelezen worden zolang hij niet is verlopen of ingetrokken.

## Aangetroffen bestaande structuur (echt gecontroleerd in CORE D1)
- core_users.id is de bestaande accountidentiteit.
- core_stories.owner_user_id koppelt het verhaal aan de eigenaar.
- core_social_comments.story_id + author_user_id koppelt een reactie aan verhaal en schrijver.
- core_social_notifications.receiver_user_id + story_id + comment_id koppelt de berichtenbox.
- core_social_invites bevat bestaande uitnodigingen inclusief token_hash, expires_at en revoked_at.

**Geen tweede accountdatabase en geen aparte berichtenbox maken.** Gastlinks krijgen een eigen, uitwisselbare link-administratie; accounts, verhalen en reacties blijven in CORE.

## Reeds gebouwd in aparte testomgeving
- EU-staging-D1 `talera-guest-shares-clean-staging-20261030`: tabellen talera_guest_shares en talera_guest_media plus indexen.
- Worker `talera-guest-links-staging-20261030`: GET /g/:token (alleen geldig, niet ingetrokken, actieve bronherinnering); POST /api/guest-links (strict same-origin, vier looptijden en owner-capability-verificatie); /__health.
- GitHub herstelbranch `fix/clean-social-whatsapp-20261030`, bronbestand src/clean-social-share/guest-worker.mjs.
- Browser Rendering: /__health succesvol; ongeldige bearerlink toont ‘Deze herinnering is niet meer beschikbaar.’
- V51-staging: één sociale balk, geen dubbele legacycontroller, per-herinnering hartjes en lokale reacties; verzenden blijft geblokkeerd.

## Kritieke blokkade: accountidentiteit
De CORE-database heeft vier actieve accountgebonden verhalen; geen van die vier heeft een owner-capability in core_story_capabilities. De oude TALERA Core capability is dus niet het logincontract voor nieuwe accountverhalen. De huidige account-social API valideert Cloudflare Access JWT en is niet geschikt als klantzichtbare aanmeldflow.

Het aanmaken van gastlinks vereist een geverifieerde TALERA-eigenaarssessie waarvan een betrouwbare account-ID kan worden afgeleid, met serverautorisatie dat core_stories.owner_user_id overeenkomt. De huidige staging-Worker weigert daarom terecht accountverhalen zonder passende owner-capability; er wordt geen beveiliging uitgezet of account-ID vertrouwd.

## Nog niet gereed / noodzakelijke integratie
1. Kies/implementeer één TALERA-eigen aanmeld-/sessiecontract, account-ID serverzijde geverifieerd. Cloudflare Access uitsluiten uit de klantflow.
2. Vervang het prototype dat alleen een owner-capability accepteert door een account-sessiechecker die de bestaande CORE-gebruiker koppelt, met expliciete story authorization.
3. Laat bij het aanmaken van de uitnodiging linktoken en vervaltijd atomair opslaan. Ondersteun unieke links per actie, idempotency bij retries.
4. Breng alle geselecteerde mediabestanden (inclusief afbeelding/audio/video waar toegestaan) met toestemming tijdelijk onder serverautorisatie; maak vooraf gecontroleerde WhatsApp-OpenGraph-preview.
5. Verbind V51-deelcontroller via same-origin route met de nieuwe service, schakel de verzendknop pas in na een bevestigde invite.
6. Alle negatieve tests: niet-eigenaar, manipulatie, verlopen, ingetrokken, andere story, media, account, spoofed headers, cookies, XSS, mislukte upload, geen automatische sociale publicatie.
7. Test met echte iPhone en WhatsApp voordat een uitrol wordt geclaimd.

## Status
Dit is een technische bouw- en auditstatus, **geen volledig functionerende WhatsApp-eindversie**. V45/V49/V50 blijven behouden en bestaande accountdata is niet gewijzigd.