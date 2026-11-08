# TALERA — opslagcontract: actuele servicegrafiek, D1/R2-inventaris en veilige integratiegrenzen

**Datum:** 8 november 2026. **Uitvoering:** uitsluitend GitHub-bronanalyse en GET-only Cloudflare Worker metadata + GET-only live Worker-scripts; geen D1 records gelezen, geen accounts geauthenticeerd, geen mediabestanden opgevraagd, geen Worker, database of PWA gewijzigd.

## Belangrijkste conclusie

**TALERA is niet uitsluitend een D1-accountdatabase met één R2-bucket.** De actuele keten bestaat uit een centrale account-/Premium-kern, een aparte legacy-verhaal-/V9-opslag, een sociale gegevenslaag en diverse R2-opslaggroepen. Een horizontale router mag daarom niet zomaar één `env.DB`-binding vervangen. De bestaande privacy-, deel-, audio-/video- en cuecontracten moeten per opslagroute intact blijven.

## 1. Bewijsbronnen en betrouwbaarheid

- **Live Cloudflare Worker settings, 8 november**: 18 verschillende bereikbare Workers bij vijf onderzochte instappunten, 16 servicebindende verbindingen, geen onleesbare nodes. GitHub-run [42465191116](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42465191116); herbevestigd in [42465363984](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42465363984). Dit is de werkelijk geconfigureerde *servicegrafiek*, niet bewijs dat elk request alle nodes bezoekt.
- **Live in-memory broninspectie** van uitsluitend vijf eigen Workers (GET-only; de ruwe code is niet geprint of opgeslagen): `talera-clean-core-staging-20261030`, `talera-pwa-v56-whatsapp-foto-social-20261031`, `talera-pwa-v45-talera-en-whatsapp-20261030`, `talera-account-birthdate-test-20261107`, `xxory-test`. Uitvoer bevat enkel gefilterde SQL-tabelnamen, bekende letterlijke `/api/`-paden en booleans; dit is lexicale detectie, **geen compleet route- of SQL-AST**.
- **GitHub-historische bronbestanden** `xxory-test/src/worker.js`, `workblad-raw-storage-api.js`, `workblad-integration-api.js`, `workblad-story-management.js`, `workblad-v9-timeline-publish.js`, `clean-router-worker.js`, `share-preview-storage.js` en `r20-dev/account-birthdate-test/account-birthdate-worker.mjs`. Deze bewijzen architectuurcontracten, niet dat elke oude route nog actief en bereikbaar is.
- **Automatische offline contractchecks:** zes geslaagd, geen fouten. Geen klantgegevens aangeraakt.

## 2. Werkelijk actuele servicegraaf

Bij benadering ziet de *geconfigureerde* keten van de officieel geregistreerde accountgeboortedatum-PWA er als volgt uit:

```text
account-birthdate -> gesloten-herinneringen-diepblauw -> stijl-diepblauw
     -> V9-verwijdering -> V8-vertelstart -> V7-fotostrip
     -> V6-verwijderknop -> V5-rechtstreeks-bewerken
     -> R20-goedgekeurd-herstelpunt -> V61-instellingen/opslag
     -> V56-WhatsApp/foto/social
           |---> talera-clean-core-staging-20261030 (eigen DB + Premium-media-R2)
           |---> V45-talera-en-WhatsApp (eigen directe D1/R2-bindings)
           |---> eigen CORE/DB/SOCIAL_DEMO D1 + CORE_MEDIA/MEDIA/INVITES_TEST R2
```

De onderhoudskandidaat `talera-vijftalen-onderhoud-test-20261107` heeft dezelfde `TALERA_BASE` naar de diepblauwe herinneringendienst. De fase4-visuele test gaat eerst naar die onderhoudskandidaat. De eerdere `talera-closed-memory-core-test-20261106` gebruikt een *andere stijlbranch* en het historische `xxory-test` is een *zelfstandige Worker* met `DB` en `MEDIA`, niet een extra node in de getekende accountketen.

**Let op:** de live settings geven bij D1-bindingen (`BIRTH_DB`, `DB`, `CORE`, `SOCIAL_DEMO`) geen zichtbare database-naam. De **bindingnamen** zijn bevestigd; fysieke database-identiteit of gelijkheid van twee bindingen is **nog niet bevestigd**. Geen nieuwe schardingslogica baseren op de aanname dat identieke `DB`-namen identieke D1-databases betekenen.

## 3. Bestaande actuele opslagcategorieën

| Domein | Live code/binding bewijs | Vastgelegde functies | Gevolg voor router |
|---|---|---|---|
| Account en inloggen | `clean-core` D1-binding `DB`; tabellen/codeverwijzingen `accounts`, `sessions`, `auth_attempts`, `password_resets`, `/api/register`, `/api/login`, `/api/me`, `/api/profile` | Login, sessie, wachtwoord-herstel | **Centrale identiteitsbron behouden**; na authenticatie vaste interne account-ID afleiden. Niet blind cookies/shards vertrouwen |
| Geboortedatum | Aparte `BIRTH_DB`; `account_birthdates`, `/api/profile/birthdate` | Eigen geboortedatum en beide persoonlijke tijdlijnen | Privéprofiel aan **exact dezelfde server-geverifieerde account-ID** verbinden; bestaande datum en twee tijdlijnen niet wijzigen |
| Kernherinneringen | `clean-core` D1; `memories`, `memory_grants`, `pwa_memory_links` | Herinneringen, toewijzingen en accounts/zichtbaarheid | Stabiele **account-ID → shard** én **memory-ID → shard** voor routes zonder account-ID |
| Delen/anderen toegang geven | `clean-core` D1; `shares`, `/api/shares`, `/api/shared-with-me`, `/api/my-grants`, `/api/messages` | Shares, rechten, cross-account relaties | Ook **share-token/hash → juiste shard** en toegang/ingetrokken rechten checken, vóór privé-media leveren |
| Premium | `clean-core` D1; `talera_premium_current`, `talera_premium_records`, `talera_premium_uploads`, `talera_premium_upload_parts`, `talera_premium_media`, `talera_premium_cloud_consent` en `/api/premium/cloud/*` | Actueel Premium-verhaal, privé-uploads, deelbestanden | Niet separaat scharden zonder sessie-, toestemming-, multipart- en recordcontracten te bewaren |
| Sociaal | V56/V45 D1-bindingen `CORE`, `DB`, `SOCIAL_DEMO`; tabellen/codeverwijzingen `core_users`, `core_stories`, `core_story_media`, `core_story_grants`, `core_social_comments`, `core_social_story_likes`, `core_social_notifications`, `core_social_invites`, `v9_memories` | Sociale verhalen, toegang, reacties, uitnodigingen, meldingen | Global/aggregate lookups apart behandelen; meerdere Workers schrijven mogelijk rechtstreeks naar deze D1's |
| Historische workblad/verhaalopslag | `xxory-test` eigen D1 `DB`; `stories`, `story_texts`, `story_media`, `shares`, `events`, `v9_timeline_links`, `storylab_clean_timeline_links` in broncode/live lexicale scan | Story ID, beheerhash, foto-/audio-objectkeys, delen, V9/tijdlijnpublicatie | **Story ID en hashed share-/beheertokens** zijn noodzakelijke routeringssleutels naast account-ID. Historische tabel `stories` heeft geen `account_id`-kolom; eigendom verifiëren vóór samenvoegen |
| Objectopslag/audio/video | Bevestigde R2-bindings `PREMIUM_MEDIA`=`talera-core-media`, `PREMIUM_PRIVATE`=`talera-premium-private-eu-staging`, `SHARE_MEDIA`=`talera-account-social-media-staging-20261029`, `CORE_MEDIA` naar dezelfde social mediabucket, `MEDIA`=`xxory-test-media-eu`, `INVITES_TEST`=`talera-share-v12-invitations-test-20261028` | Originele bestanden, share-previews en privé-/Premium-media | **Bestaande objectkeys en bucketlocatie intact laten**; nieuwe D1 bevat alleen pointers/metadata en geen kopieën van media |

### Broncode: grensgevallen met extra regressierisico

- `xxory-test/src/worker.js` bevat `GET /api/s/:shareToken` en `GET /api/s/:shareToken/audio`: delen resolveert eerst `shares` + `stories` + `story_texts` binnen dezelfde D1 en haalt daarna audio uit R2. Een opslagrouter moet de juiste shard vinden **vóór** die JOIN en de R2-opvraag.
- Het historische `/api/integration/stories/:storyId` leest `stories` en `story_media` op story-ID, beschermd door `manage_token_hash`; de story-ID alleen is **geen autorisatie**.
- `storylab-clean/publish` en de V9-tijdlijnpublicatie doen multi-table transacties binnen één D1 (`stories`, `story_texts`, `story_media`, linktabellen). Deze rijen moeten bij sharding samen binnen **dezelfde fysieke D1** blijven. D1-transacties lopen niet automatisch over meerdere shards.
- Er zijn meerdere routes met `env.DB.prepare` en `env.DB.batch` plus directe R2 `.put/.get/.delete`; één Workerbinding vervangen garandeert niet dat alle schrijfpaden dezelfde router gebruiken.
- `share-preview-storage.js` bewaart previews/invite-JSON in R2. Share-previews zijn dus niet uitsluitend D1-handelingen.
- `account-birthdate-worker.mjs` authenticeert via `talera_sid` en `TALERA_BASE /api/me`, houdt geboortedatum apart; dit mogen we niet vervangen door een ongeautoriseerde demo-route.

## 4. Expliciete architectuurbesluiten voor veilige TALERA-sharding

1. **Een routeringscontract, geen tweede vertelsysteem.** De iPhone/PWA, visuele timeline, teller, swipe/foto-ID's, opnamecues en ene presentatieplayer blijven identiek; alleen backend-opslagroutes mogen na onafhankelijke acceptatie worden gewijzigd.
2. **Server-side eigendomsbron.** Bevestig gebruiker via bestaande kernsessie. Account-ID is het enige gezag voor nieuwe per-gebruiker-shardplaatsing. Een clientmag NOOIT zelf fysieke shardname, database-ID of account ID als autorisatiebewijs aanleveren.
3. **Eénmalig vastleggen** van `account_id → data_shard`. Daarnaast voor routes zonder account of voor gedeelde links een **duurzame `memory_id/story_id → shard` resolver**. Voor openbare deelcodes: `share_id` of gehashte token naar shard met rechtencontrole en revocation.
4. **De gerelateerde data samen houden.** Verhaal, tekst, media-manifest, foto-volgorde, audio/video cue-tijdstempels, bewerkingsstatus en bijbehorende toegang moeten intern consistent zijn; over meerdere D1's is geen gezamenlijke ACID-transactie.
5. **Bestaande R2-objectkeys NIET verhuizen of herschrijven** tijdens een eerste D1-routerintegratie; media-bucketbindingen en Range/ETag/audioplayback behouden. Controleer uploadcompensatie bij gedeeltelijk mislukte DB/R2-opslag.
6. **Privacy en sociale cross-user-queries** vereisen aparte globale index/aggregatie of een gericht feedcontract. Geen ongeautoriseerde 'scan alle shards'-API bouwen; geen revocation via onbetrouwbare cache.
7. **Consistente reads** na aanmaken/wijzigen via D1 Sessions/bookmarks op de juiste fysieke D1. Directory mag cache/replica benutten alleen als nog-niet-gepubliceerde mappings op de primary worden gevonden.
8. **Leeg of ontbrekend account/shard = expliciete fout**, nooit stilzwijgend op verkeerde database terugvallen; maak database-activering idempotent, auditbaar en begrensd.
9. **Bij nieuwe shard C/D** blijven bestaande accounts op A/B. Een bijna volle A wordt voor nieuwe accounts afgesloten maar **bestaande accounts blijven schrijven** en hebben tegen 10 GB uiteindelijk een gecontroleerde, met back-up geteste account-/verhaalmigratie nodig.
10. **Voorbereiden voor één miljoen gebruikers** vereist een bewezen read/write-belastingsmatrix en een oplossing voor hotspots in de centrale identiteits-/routerdirectory, social feed en uploads; alleen meer D1's is geen bewijs van oneindige schaal.

## 5. Volgorde van het veiligste vervolg

**Fase S1 — gereed (DEZE PR, geen writes):** inventaris van historische opslagtabellen, actuele live serviceketen, live code SQL/API-signalen en toegangs-/sleutelafhankelijkheden.

**Fase S2 — testrouteradapter uitsluitend met nieuwe fictieve accounts:** voor accounts én afzonderlijke story-/share-ID's duurzame directory-indexen toevoegen in **de bestaande, exclusieve staging-D1 directory**; alle routes afdekken met opslagcontract-tests. Nog GEEN echte TALERA-PWA-koppeling of bestaande media-objecten gebruiken.

**Fase S3 — TALERA staging-integratie:** laat een gescheiden test-PWA met een eigen accountsysteem via dezelfde URL-origin door die adapter werken. `register/login/me`, een testverhaal inspreken/uploaden, foto-/video-cues, private media, delen/intrekken, wijzigen en verwijderen. Alleen nieuwe, synthetic user content en aparte R2; kernrecorder/frontend niet wijzigen.

**Fase S4 — performance, recovery en migratie:** test uitval van directory/een shard, retries, half geslaagde R2+D1 operatie, 75/80%-storagesignalen, R2-uploads, hoge concurrency, herstel en gecontroleerde liveproef met nul echte gebruikersgegevens; pas dan migratiepad voor reeds bestaande accounts opstellen.

**Fase S5 — acceptatie vóór lancering:** echte iPhone-regressie van originele vertelcyclus, één player, media-ID's/timestamps, beide tijdlijnen, login, Premium, share-revocation, Free/Premium-privacy en gespreid opschalen. Op een **nieuwe kandidaatlink**, nooit de door de gebruiker als beste aangewezen link overschrijven of automatisch mergen.

## 6. Openstaande bewijspunten

- De Cloudflare Worker-settings API bevestigt welke D1-bindings bestaan, maar retourneert geen publiek getoonde fysieke D1-databasenamen voor `BIRTH_DB`, `CORE`, `DB` of `SOCIAL_DEMO`; eventuele gelijke fysieke database-ID's moeten afzonderlijk gecontroleerd worden zonder klantgegevens.
- Live-code-inspectie leverde herkenbare tabelnamen/routelexemen, maar is **geen exacte uitvoerroute- of datamodelbewijs**. De huidige SQL-tabellayout, indexen, FK's, fysieke eigenaarsschema's en gezaghebbende auth-workflow moeten voor uitvoering van S3 op een uitsluitend fictieve stagingkopie worden geverifieerd.
- De automatische D1-reservecapaciteit is al in een aparte stagingopzet beproefd (A/B actief, C/D reserve, GitHub zesuurlijkse aanvulling). **Geen** van deze services is al op echte TALERA-verhalen aangesloten.
- Het globale project `main` heeft afzonderlijke bestaande regressietests die op ontbrekende bronbestanden falen; uit de geslaagde specifieke opslagcheck volgt geen algemene regresievrijheid van TALERA.

## Acceptatie S1

De actieve account-, verhaal-, Premium-, social-, media- en deelroutes zijn op **de storage-contract-grenzen** geïnventariseerd; onderscheid tussen live bindingbewijs en lexicale historie is vastgelegd; geen gebruiker, account, object, mediastroom of Worker is gewijzigd. De volgende stap is **alleen S2 in staging**.

**Bewijsrun:** https://github.com/Marksmits1972/talera-lifeline/actions/runs/42465363984

**Officiële beste PWA (ongewijzigd):** `https://talera-account-birthdate-test-20261107.mark-a39.workers.dev/mijn-leven`.