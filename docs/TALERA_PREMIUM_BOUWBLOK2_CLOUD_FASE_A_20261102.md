# TALERA Premium — bouwblok 2: cloudopslag, fase A (2 november 2026)

Status: ontwerpbesluit bevestigd op 2 november 2026; nog NIET uitgerold. Na eenmalige toestemming standaard automatische cloudopslag én synchronisatie voor Premium.

## Bestaande infrastructuur
- Account- en rechtenbron: bestaande Clean Core Worker `talera-clean-core-staging-20261030` en D1 `talera-clean-core-staging-20261030`.
- `GET /api/me/entitlements`: `rights.permissions.cloud_storage` is een *recht*, maar `rights.available.cloud_storage` blijft false tot veilige functionaliteit live is.
- TALERA Free bewaart herinneringen lokaal in IndexedDB (`stories`, `files`); export/herstel via `.talerabackup` blijft intact.
- Bestaande TALERA R2-bucket `talera-account-social-media-staging-20261029` behoort tot de sociale deelketen; deze bucket niet zonder isolatie inzetten voor persoonlijke Premium-cloudmedia.
- Aanwezige bucket `talera-core-media` is historisch en niet zonder verificatie als Premium-bestemming te hergebruiken.

## Minimale scope, veilig en eenvoudig
1. Premium vraagt één keer expliciete toestemming voor cloudopslag en eventuele migratie van bestaande lokale herinneringen. Daarna worden nieuwe en gewijzigde Premium-herinneringen standaard automatisch veilig geüpload en gesynchroniseerd; geen toestemming per foto of herinnering. Server controleert altijd accountrecht en beschikbaarheid.
2. TALERA Free blijft lokaal. Bij overstap naar Premium worden na de eenmalige toestemming bestaande lokale herinneringen overgezet; de lokale exemplaren blijven behouden totdat veilig opslaan is bevestigd.
3. Upload via geauthenticeerde bestaande Core Worker. Objectnaam uitsluitend servermatig samengesteld uit geverifieerde account-ID en gegenereerd object-ID; nooit ruwe gebruikersbestandsnamen of client-account-ID als autoriteit.
4. Per bestand: grootte/MIME grenzen, integriteitscontrole, eigenaarschap, quota en fouten terugkoppelen. Sla alleen benodigde metadata in dezelfde D1 op, mediabytes in afgeschermde R2.
5. Download, lijst en verwijderen uitsluitend via serverzijdige controle op eigenaar; geen publieke R2-links.
6. Upload pas als voltooid tonen na objectverificatie en atomische metadatavastlegging; bij fout mag lokaal origineel nooit verloren gaan.
7. Synchronisatie hoort bij de standaard Premium-belofte. De bouw mag gefaseerd getest worden (upload, teruglezen, automatische sync en conflicten), maar de gebruikerservaring kent na toestemming geen handmatige uploadstappen.
8. Bij verlopen Premium-recht geen nieuwe uploads; bestaand materiaal niet automatisch wissen. Toegang, export, bewaartermijn en eventuele downgrade vooraf definiëren.
9. Bestaande gedeelde links, WhatsApp, hartjes, gesprekken, Free-back-ups en persoonlijke verhalen ongemoeid laten.

## Acceptatie voor live vrijgave
- Free en niet-ingelogd kunnen geen cloudobject uploaden of lezen.
- Premium met testrecht maar `available:false` kan nog niets uploaden.
- Premium na eenmalige toestemming: bestaande lokale herinneringen worden veilig gemigreerd en nieuwe/gewijzigde herinneringen automatisch geüpload; lokale bronbestanden blijven behouden totdat cloudopslag bevestigd is.
- Ander account krijgt 403/404 bij object-ID; geen object-/account enumeratie.
- Herhaald uploadverzoek veroorzaakt geen onbedoelde dubbele data; falende upload wordt veilig hersteld.
- Vervallen/intrekken van testrechten sluit nieuwe upload af.
- Echte iPhone/Safari en desktop met een afzonderlijk **inlogbaar** testaccount getest vóór bredere uitrol.

## Besluit
Deze fase legt de bouwgrens vast zonder nieuwe Worker of ongevraagde D1/R2-migratie. De expliciete toestemming geldt één keer voor de overgang naar automatische Premium-cloudopslag, niet per herinnering. Volgende implementatiehandeling: audit van de bestaande Core Worker-bindings, R2 bucket-isolatie en serverroutes; pas daarna het kleinste werkende uploadpad schrijven en lokaal testen. Geen claim dat cloudopslag of synchronisatie al werkt.

## Vast ontwerpbesluit gebruiker — 2 november 2026
TALERA Premium belooft standaard cloudopslag en synchronisatie. Na éénmalige gebruikersinstemming verloopt dat automatisch voor alle Premium-herinneringen. Geen individuele selectie of handmatige upload als normale werking. TALERA Free blijft lokaal. Dit besluit vervangt alle eerdere formuleringen over handmatig kiezen van cloudherinneringen.

## Vast ontwerpbesluit — betaling, directe rechten en QR/TV-kijken (2 november 2026)
- Zodra een betaling **serverzijdig als geslaagd is bevestigd** (betrouwbare betalingsprovider/webhook; niet louter browserredirect), worden de rechten van het betaalde Premium-pakket direct actief op het account. De daadwerkelijke functies worden alleen zichtbaar/bruikbaar voor zover technisch beschikbaar. Betalingskoppeling bestaat nog niet; niet als gebouwd presenteren.
- Bij eerste Premium-activatie vraagt TALERA één keer toestemming voor migratie en automatische cloudopslag. Daarna start de upload automatisch, zonder per-herinnering-vragen.
- **Rechten actief ≠ cloudinhoud al klaar.** QR-code-/familie-/TV-kijken is afhankelijk van de aanwezigheid en verwerking van de betreffende herinneringen/media in de cloud. Geen 'gereed'-melding of werkende QR-presentatie beloven voordat de relevante upload en eventuele verwerking voltooid zijn.
- In de QR-code-kijkroute komt een korte, vriendelijke uitleg vóór het tonen/genereren van een kijkcode (met duidelijke status indien upload nog bezig is): **'Net Premium geworden? Je herinneringen worden eerst veilig naar de cloud overgezet. Dat kan even duren, vooral bij veel foto's en video's. Zodra het overzetten klaar is, kun je ze samen via de QR-code bekijken.'**
- Wanneer relevant: status 'Herinneringen worden overgezet', voortgang waar betrouwbaar meetbaar, en 'Klaar om samen te kijken'. Geen verzonnen minuten of vaste wachttijd. In de tussentijd blijven lokaal beschikbare herinneringen zichtbaar op het eigen apparaat.
- Implementatie: betaalbevestiging idempotent verwerken; entitlement toekennen op bevestigde betaalstatus, cloud-upload apart asynchroon/voortzetbaar en foutbestendig; QR kijkroute alleen beschikbaar voor daadwerkelijk cloudbeschikbare geselecteerde inhoud. Intrekking/downgrade en autorisatie blijven serverzijdig afgedwongen.
- Niet nu bouwen: providerintegratie, definitieve UX of geautomatiseerde upload zijn nog toekomstige stappen. Dit is de verplichtende bouwspecificatie.


## Vast ontwerpbesluit — betalingsprovider pas bij circa 99% gereed (2 november 2026)
De echte betalingskoppeling wordt bewust uitgesteld totdat circa 99% van de productfunctionaliteit klaar is. Nu geen betalingsprovider, betaalpagina, webhook of echte incasso implementeren.

**Testvervanging zonder extra account- of betaalarchitectuur:** gebruik de bestaande beveiligde Premium-testrechten (talera_premium_test_grants), uitsluitend toe te kennen/intrekken door een bevoegde beheerder. Hetzelfde centrale entitlementbeleid moet zowel testrechten als toekomstige betaalde Premium-rechten laten gelden, zonder de Cloud-/AI-/QR-functies voor gebruikers met Free-rechten open te zetten.

Testscenario's: Free → Premium-testrecht → eenmalige cloudtoestemming → automatische upload/sync → QR-kijken zodra relevante cloudmedia gereed is → intrekken/verlopen → nieuwe Premium-handelingen geblokkeerd. Simuleer eventueel een 'betaling bevestigd'-gebeurtenis in geïsoleerde tests die daarna de rechtenverlening aanroept; **geen nepbetaling** registreren als echte commerciële betaling.

**Heldere UI:** toon 'Premium-testtoegang' voor beheertests, nooit 'Betaald' of een factuur. In productie blijft er geen algemene knop over waarmee gebruikers zichzelf Premium kunnen geven. Zelf-toekennen blijft serverzijdig onmogelijk. Het intrekken van een recht mag nooit stil persoonlijke cloudgegevens verwijderen.

**Laatste integratiestap rond 99%:** echte provider koppelen aan hetzelfde rechtensysteem met serverzijdig geverifieerde, idempotente betaalbevestiging; aparte test van hernieuwen, mislukte betaling, terugbetaling en opzegging. Tot dan is commercialBillingActive:false correct.


## Uitvoering — fase B, 2 november 2026
- Bestaande Clean Core Worker-bindings gecontroleerd: DB = bestaande staging D1, PREMIUM_PRIVATE = talera-premium-private-eu-staging, PREMIUM_MEDIA = talera-core-media, SHARE_MEDIA = afzonderlijke sociale bucket.
- Geen nieuwe Worker of R2-bucket gemaakt. Premium-pilotflags bestaan al in de Core Worker.
- D1-migratie migrations/20261102_premium_private_media.sql in bestaande staging D1 toegepast: talera_premium_media en index aanwezig; direct daarna nul records bevestigd.
- Nieuwe uploadmodule src/core/premium-private-upload.mjs is uitsluitend broncode; nog NIET verbonden met publieke routes, geen persoonlijke uploads uitgevoerd.
- Privacy-/beveiligingsgrens: testaccount krijgt niet vanzelf uploads; rechten + eenmalige toestemming + serveridentiteit + checks moeten vóór live openstelling zijn afgedwongen.
- Nog uit te voeren voor functioneel gereed: serverroute met authentieke sessie; duurzame consentregistratie; R2-opslagtransacties en foutafhandeling; uploadwachtrij/retries; IndexedDB-migratie en automatische sync; e2e tests met fictieve media. Het nieuwe testsbestand is nog niet gedraaid. QR-status volgt pas na gecontroleerde cloudverwerking.


## Uitvoering fase C — consent en autorisatie (2 november 2026)
- Nieuwe pure autorisatiemodule: src/core/premium-cloud-auth.mjs. Controleert geverifieerde sessie, actieve Premium-cloudrechten, featurebeschikbaarheid, pilotflag en opgeslagen eenmalige toestemming. Een account-ID mag nooit uit een ongecontroleerde aanvraag worden overgenomen.
- Acht testgevallen toegevoegd: test/premium-cloud-auth.test.mjs. Nog niet als door CI uitgevoerd geclaimd.
- Nieuwe D1-tabel talera_premium_cloud_consent toegevoegd aan de **bestaande** stagingdatabase met een accountgebonden consentstatus. Direct gecontroleerd: 0 toestemmingen.
- Migratie vastgelegd: migrations/20261102_premium_cloud_consent.sql.
- Deze pure module staat in GitHub, maar is nog niet in de live Core-route opgenomen. Geen daadwerkelijke uploads, geen automatische toestemmingen en geen wijziging aan TALERA Free.
- Voordat de pilot gebruikt wordt: de bestaande Core Worker moet veilige GET/POST-consentroutes aanbieden met serverafgeleide gebruiker; origin/CSRF-controle en rate limiting; uploadpad met hercontrole bij ieder bestand; en volledig werkende terugleesroute. Daarna pas voor uitsluitend testaccounts beschikbaar maken.
- Voor UX blijft de afspraak ongewijzigd: slechts één keer toestemming; daarna automatisch en hervatbaar synchroniseren, nooit per herinnering bevestigen.

## Uitvoering fase D — routeadapter (2 november 2026)
- Bron: src/core/premium-cloud-routes.mjs. Consent GET/POST, accountgebonden mediamanifest GET, privé-object GET en pilot-upload PUT. Identiteit uit geverifieerde server-sessie; geen account-ID uit URL/body als autoriteit.
- Zes gerichte route-contracttests toegevoegd in test/premium-cloud-routes.test.mjs. Nog niet uitgevoerd en routeadapter nog NIET in actieve Core Worker geïntegreerd.
- Pilot moet standaard gesloten blijven; bestaande Core moet zijn CSRF-/Origincontrole, authenticatie, rate limiting en entitlementbeleid vóór aanroep toepassen. Uploadbewaking voor mediagroottes/streaming en samenloop/idempotentie nog integraal toetsen.
- Nog NIET gereed: client IndexedDB-wachtrij, automatische hervatting, beveiligde live-integratie, downloadacceptatie en QR-beschikbaarheidskoppeling. Geen persoonlijke media geüpload.

## Fase E — uploadgrenzen aangescherpt (2 november 2026)
- De pilotroute weigert opgegeven bestanden groter dan 25 MiB en leest de uploadstream met een harde bovengrens, ook zonder Content-Length-header (relevant voor browsers). Lege bestanden en opgegeven lengte die niet overeenkomt met de ontvangen bytes worden geweigerd.
- Twee extra route-tests toegevoegd voor te grote bestanden en ontbrekende Content-Length met ongeldige hash. Nog niet als uitgevoerd aangemerkt.
- De 25 MiB limiet is strikt voor deze technische pilot en **geen** productlimiet voor TALERA video's. Voor volledige Premium moeten grote uploads via begrensde, hervatbare chunks of gelijkwaardige streaming worden verwerkt, inclusief retry en integriteitscontrole.
- De code is niet live gekoppeld aan de bestaande Core Worker. Nog geen daadwerkelijke cloudupload of cross-device sync bewezen. Eerst code- en regressietests, daarna geïsoleerde stagingintegratie met testaccount en fictieve media.

## Fase F — gelijktijdige uploads (2 november 2026)
- Bronmodule src/core/premium-private-upload.mjs aangepast: bestaande objecten worden bij parallelle upload niet meer blind overschreven; bij fout tijdens D1-manifestschrijving wordt het R2-object niet meteen verwijderd, om verlies van een andere geslaagde aanvraag te voorkomen.
- Twee regressietests toegevoegd aan test/premium-private-upload.test.mjs: afwijzing bij parallelle upload en geen verwijdering bij manifestfout.
- GitHub Actions leverde voor de nieuwste commit geen workflowresultaten. De tests zijn dus nog niet aangetoond als geslaagd. Geen deployment naar actieve Worker; bestaande Free- en Premium-testbeheerfuncties niet geraakt.
- Vóór live zetten: conditionele R2-write verifiëren tegen echte Worker/R2, conflict- en orphan-reconciliatie testen, volledige testset draaien en pas daarna afgeschermde end-to-end test uitvoeren.

## Fase G — geautomatiseerde tests (2 november 2026)
- `.github/workflows/premium-cloud-tests.yml` toegevoegd op de bestaande bouwbranch. Node 22 voert de vier gerichte Premium-cloudtestbestanden uit bij relevante codewijzigingen en via handmatige workflowstart.
- Deze workflow bevat **geen** deployment, betaalprovider of echte opslagopdracht; test alleen de modules met fictieve invoer.
- Bij de eerste controle waren nog geen commit-gekoppelde workflowresultaten beschikbaar. Teststatus dus **onbevestigd**, niet als geslaagd rapporteren.
- De daadwerkelijke Cloudflare R2 end-to-end upload/downloadtest en bestaande Core Worker integratie blijven afzonderlijke vervolgstappen.

## Fase H — fictieve end-to-end test (2 november 2026)
- `test/premium-cloud-e2e-fixture.test.mjs` toegevoegd: simuleert upload, teruglezen, accountisolatie en Free-afwijzing met in-memory D1/R2 mocks; er worden geen persoonlijke data of echte R2-objecten gebruikt.
- `.github/workflows/premium-cloud-tests.yml` uitgebreid zodat deze test samen met de eerdere moduletests wordt uitgevoerd zodra Actions de workflow draait.
- Workflowstatus is nog NIET bevestigd als succesvol. De mock bewijst nog geen echte Cloudflare R2 end-to-end werking. Geen productie-uitrol.

## Fase I — automatische lokale uploadwachtrij (2 november 2026)
- `src/mijn-talera/premium-sync-queue.mjs` toegevoegd: kleine begrensde wachtrij voor nieuwe/bestaande lokale media. Per upload controle op geldige Premium-toegang en internetverbinding, lokale status pas als gesynchroniseerd markeren bij expliciete serverbevestiging. Fouten laten lokale herinneringen staan en kunnen bij volgende aanroep opnieuw worden geprobeerd. Geen per-bestand-toestemming.
- Zeven gerichte tests in `test/premium-sync-queue.test.mjs`; toegevoegd aan de bestaande GitHub Actions-workflow.
- Dit is nog een losse herbruikbare module, niet geïntegreerd in bestaande IndexedDB of actief in de PWA. De aanroep-/retryplanning en volledige verwerking van grote video's blijven nog te verbinden. Geen live Core- of Free-wijzigingen. Workflow-uitvoering nog onbevestigd.

## Fase J — bestaande IndexedDB lezen (2 november 2026)
- `src/mijn-talera/premium-indexeddb-bridge.mjs` toegevoegd als read-only adapter naar bestaande database `talera-lifeline-dev-local-v1` en store `files`. Geen tweede IndexedDB, geen schema-upgrade en geen wijziging in Free-back-up.
- De adapter selecteert lokale media-Blobs, bereidt stabiele media-ID's voor en heeft een fetch-interface voor de beveiligde Core-uploadroute. Twee unit-tests toegevoegd en in CI-testopdracht opgenomen.
- Nog NIET ingebouwd in actieve PWA of automatisch gestart; echte consent/entitlement API en markSynced-methode moeten veilig worden aangesloten. De huidige media-ID is gebaseerd op sleutel/grootte/mime; voor gewijzigde media moet eerst versiestrategie of content-hash worden verwerkt om botsingen te voorkomen. Stories-tekst en relaties vallen nog niet binnen deze media-bridge.
- Geen uploads uitgevoerd; tests nog niet als uitgevoerd bevestigd.

## Fase K — gewijzigde lokale media betrouwbaar herkennen (2 november 2026)
- `createPremiumManifest` in `src/mijn-talera/premium-indexeddb-bridge.mjs` gebruikt nu de SHA-256-inhoud van de Blob, samen met de lokale sleutel en het mediatype, voor een stabiele versiegebonden media-ID. Hierdoor krijgen foto's met dezelfde sleutel en grootte maar gewijzigde inhoud een andere cloud-ID.
- Bestaande manifesttest aangepast om een echte fictieve Blob te gebruiken; regressietest toegevoegd voor gewijzigde bestanden met dezelfde grootte.
- Bestaande IndexedDB-structuur en Free-back-up blijven ongemoeid. Voor veel/grote video's kan volledig hashen van de Blob kostbaar zijn: dit is nog niet de definitieve hervatbare grote-video-upload.
- Nog niet actief gekoppeld aan de PWA. Tests zijn toegevoegd maar nog niet bevestigd als uitgevoerd. Geen echte uploads of wijzigingen aan persoonlijke herinneringen.

## Fase L — lokale media + Premium-sync coördineren (2 november 2026)
- `src/mijn-talera/premium-sync-coordinator.mjs`: testbare verbindingslaag tussen bestaande IndexedDB-reader, cloudmanifest, synchronisatiewachtrij en servergecontroleerde Premium-rechten/toestemming. Controleert serverrechten vóór het uitlezen van lokale media en hercontroleert vóór iedere upload.
- Bestaande servermedia-ID's worden vergeleken om dubbele uploads te beperken. Uploadstatus wordt alleen voor deze tijdelijke run in het geheugen bijgehouden, zonder Free-store of persoonlijke herinneringen te wijzigen.
- Twee tests toegevoegd in `test/premium-sync-coordinator.test.mjs`; opgenomen in GitHub workflow. Uitvoering nog niet bevestigd.
- **Nog niet geïntegreerd in actieve PWA**. Server moet consent-/media-API aanbieden via dezelfde origin of expliciete veilige bestaande router. De bestaande V62 PWA proxyt naar V56; niet aannemen dat nieuwe `/api/premium/cloud/*` routes automatisch de Core Worker bereiken.
- Nog nodig: end-to-end accountcontrole, grote video-chunks, metadata/stories-synchronisatie, veilig scheduling/retry. Geen betaalprovider, Free-wijziging of live upload.

## Fase M — strikt afgeschermde Core-pilot (2 november 2026)
- Huidige PWA V62 verwijst niet rechtstreeks naar Clean Core: de `src/mijn-talera/worker.js` router geeft overige routes door aan V56_BASE. Daardoor mogen de nieuwe cloudroutes niet blind via PWA worden vrijgegeven.
- `src/core/premium-cloud-pilot.mjs` toegevoegd: gebruik bestaande Core-pilotbindings, beperkte account-allowlist en serverafgeleide `manual_test`-entitlement. Alleen zo mag de cloudbeschikbaarheid voor een pilotaccount worden aangezet; Free en andere Premium-gebruikers houden `available.cloud_storage=false`.
- Zes gerichte tests toegevoegd en opgenomen in GitHub Actions. Uitvoering nog onbevestigd. Module is nog NIET gemonteerd in bestaande Core Worker en pilot is niet geactiveerd.
- Vervolg: geverifieerde Core-sessie en entitlement binnen bestaande Worker aan routeadapter koppelen, originbeveiliging verifiëren; PWA same-origin doorgifte alleen voor geselecteerde pilotroutes expliciet bouwen en met testaccounts beoordelen. Geen productie-/Free-aanpassingen en geen betalingsprovider.

## Fase N — bestaande Core-accountbeveiliging hergebruiken (2 november 2026)
- Cloudflare bevestigd: `PREMIUM_CLOUD_PILOT_ENABLED=false` en de account-allowlist is leeg; cloudpilot is dus daadwerkelijk uitgeschakeld.
- `src/core/premium-cloud-core-adapter.mjs` toegevoegd als fail-closed integratieadapter: verwacht de reeds geverifieerde Core-sessie en bestaande helpers voor rechten, request-origincontrole en rate limiting; geen nieuwe inlogstructuur. Alleen allowlisted testaccounts met handmatig Premium-recht komen door de poort.
- Zes regressietests in `test/premium-cloud-core-adapter.test.mjs` toegevoegd aan de bestaande testworkflow. Tests nog niet bevestigd als uitgevoerd.
- De adapter is **nog niet** in de actieve Clean Core Worker ingebouwd, de PWA-router is niet gewijzigd en er zijn geen uploads uitgevoerd. De pilot blijft dicht totdat de daadwerkelijke veilige sessie-/route-integratie en geïsoleerde R2-test zijn bewezen.

## Fase O — uploadbevestiging vóór lokale syncstatus (2 november 2026)
- `src/mijn-talera/premium-indexeddb-bridge.mjs` accepteert een upload nu alleen als de HTTP-respons succesvol **en** de serverbody expliciet `ok:true` meldt. Een HTTP-fout met misleidende respons of ontbrekende serverbevestiging mag nooit leiden tot lokaal `synced`.
- Twee regressietests voor mislukte en onbevestigde responses toegevoegd aan `test/premium-indexeddb-bridge.test.mjs`; bestaande succesvolle mock aangepast met correcte HTTP-status.
- Werkelijke Core-integratie is nog niet uitgerold: Cloudflare-pilot staat uit; broncode alleen op featurebranch. Tests zijn nog niet aantoonbaar gedraaid. Geen live gebruikersdata geraakt.

## Fase P — herstelbare rechtencontrole, lokale test (2 november 2026)
- In `src/mijn-talera/premium-sync-queue.mjs` geven fouten tijdens de eerste en tussentijdse Premium-rechtencontrole voortaan gecontroleerd `not_enabled` terug in plaats van de synchronisatieronde abrupt te laten mislukken.
- Twee aanvullende regressietests toegevoegd aan `test/premium-sync-queue.test.mjs`.
- Drie gerichte tests uitgevoerd met Node 22 in een lokale kopie van de gecorrigeerde wachtrijlogica: fout bij eerste rechtencontrole, fout midden in ronde en normale upload; 3/3 geslaagd. Dit is **geen** volledige repository-CI of echte R2-test.
- De actieve TALERA Worker en PWA zijn niet gewijzigd, pilot blijft afgeschermd, geen persoonlijke herinneringen aangeraakt.

## Fase Q — integratietests verder aangescherpt (2 november 2026)
- In `test/premium-cloud-e2e-fixture.test.mjs` twee extra afgeschermde tests toegevoegd: cloudmedia worden zonder eenmalige toestemming geweigerd; de uitgeschakelde pilot weigert ook voor een Premium-account de cloudroute. De in-memory fixture maakt de toestemmingsstatus toetsbaar.
- De reeds aanwezige upload/download-accountisolatietest blijft bestaan. Dit zijn tests met mocks en géén bewijs van een echte Cloudflare R2-upload.
- GitHub-workflowresultaten zijn via de beschikbare PR-commitopvraging niet bevestigd; geen claim over geslaagde suite. De echte end-to-end uploadroute is nog niet in de bestaande Worker uitgerold. Geen persoonlijke media geraakt en geen betaling gekoppeld.

## Fase R — teststatus en foutbestendige rechtencheck (2 november 2026)
- De bestaande GitHub-actie leverde bij controle op de laatste commit nog geen workflowresultaat terug. De volledige suite is dus **niet aantoonbaar gedraaid**. De private repository kon via de lokale shell evenmin rechtstreeks worden opgehaald; geen claim over een volledige lokale repo-test.
- `src/mijn-talera/premium-sync-queue.mjs` gecorrigeerd: zowel synchrone exceptions als afgewezen promises in `allowed()` worden nu veilig afgevangen. Een weigering of netwerkfout mag geen media als gesynchroniseerd markeren.
- Eén extra regressietest toegevoegd in `test/premium-sync-queue.test.mjs`, nog niet als geslaagd bevestigd.
- Cloudflare-pilot blijft uit en de gewone TALERA PWA is niet gewijzigd. Volgende actie: verifieer workflowuitvoering met geldige Actions-toegang of draai de repository-tests lokaal met volledige checkout; daarna pas geïsoleerde R2-upload.

## Fase S — echte Cloudflare R2-opslagtest (2 november 2026)
- Cloudflare Worker-bindings gecontroleerd: de bestaande Core Worker verwijst naar `PREMIUM_PRIVATE = talera-premium-private-eu-staging` met `jurisdiction=eu`, maar de bestemming bleek niet te bestaan (R2 API 404 / code 10006).
- Die specifieke bucket tijdelijk aangemaakt voor een technische test. Cloudflare rapporteerde `location=WEUR`, maar **`jurisdiction=default`**, niet de vereiste EU-jurisdictie. Dit is niet als conforme Premium-persoonsopslag beschouwd.
- In de tijdelijke R2-bucket is een volledig fictief tekstobject met de R2 Object API geüpload, exact teruggelezen en verwijderd. PUT, GET en DELETE werkten. Geen privéfoto's, accounts, sessies, D1-manifestwijzigingen of PWA-uploadroute gebruikt.
- De lege testbucket is aansluitend verwijderd (Cloudflare API bevestigde succes), om geen opslag met verkeerde jurisdictie te laten staan.
- **Openstaande blokkade:** de definitieve `PREMIUM_PRIVATE` bucket moet als aantoonbare EU-jurisdictie worden aangemaakt en bij de bestaande Core Worker passen. De daadwerkelijke sessie-/consent-/entitlement-/R2-route en automatische PWA-sync zijn daarmee nog NIET end-to-end bevestigd.
- Cloudpilot blijft uit, met lege allowlist; geen betaling of gebruikersdata aangeraakt. Bestaande Free- en social-mediaopslag niet hergebruiken voor de persoonlijke Premium-cloud.

## Fase T — EU-jurisdictie nader onderzocht (2 november 2026)
- Cloudflare API-specificatie bevestigt dat `cf-r2-jurisdiction: eu` bij het aanmaken hoort en dat `jurisdiction` in het resultaat `eu` moet aangeven. `locationHint: weur` alleen is daarvoor onvoldoende.
- Na de eerdere R2 CRUD-test is opnieuw exact de beoogde bucketnaam met EU-header aangevraagd. Cloudflare rapporteerde wederom `location: WEUR` maar `jurisdiction: default`. De aanmaak is daarom **niet geaccepteerd als EU-conform**; de lege bucket is weer verwijderd, met bevestigde DELETE-respons.
- Mogelijke oorzaak is dat de huidige Cloudflare-connector de opgegeven jurisdictieheader bij POST niet correct doorstuurt. Dit is nog niet bewezen; er zijn geen persoonlijke gegevens geüpload.
- Voor daadwerkelijke Premium-media eerst bij bucket-creatie in Cloudflare Dashboard of via gecontroleerde REST-client expliciet EU-jurisdictie kiezen en retourwaarde `jurisdiction: eu` verifiëren. Pas daarna gesloten pilot-route testen. De actieve TALERA PWA, Free en betaling zijn ongemoeid gebleven.

## Fase U — bucketvoorwaarde gecontroleerd (2 november 2026)
- Cloudflare-documentatie (https://developers.cloudflare.com/r2/reference/data-location/) bevestigt dat `Location: WEUR` niet gelijkstaat aan de verplichte `Jurisdiction: EU`; jurisdictie is een aparte bucketcreatiekeuze.
- Stagingstatus gecontroleerd: `PREMIUM_PRIVATE` binding verwijst naar `talera-premium-private-eu-staging` met `jurisdiction=eu`, maar de daadwerkelijke bucket ontbreekt. `PREMIUM_CLOUD_PILOT_ENABLED=false`, `PREMIUM_CLOUD_PILOT_ACCOUNT_IDS` leeg.
- Geen nieuwe bucket gemaakt omdat de eerdere API-creaties ondanks expliciete EU-header consequent `jurisdiction=default` teruggaven. Dat niet als EU-conform accepteren. Gebruik Cloudflare Dashboard R2 > Create bucket > Location > Specify jurisdiction > EU, naam exact `talera-premium-private-eu-staging`. Verifieer na aanmaak teruggelezen metadata `jurisdiction=eu`, en test dan eerst met fictief object; geen persoonlijke uploads vóór bevestiging.
- De bestaande Worker en PWA zijn bewust niet aangepast en de pilot blijft uit.

## Fase V — EU-bucket zichtbaar in dashboard, API nog niet bruikbaar (2 november 2026)
- Gebruiker heeft Cloudflare-dashboard screenshots aangeleverd met bucket `talera-premium-private-eu-staging`, expliciet `Jurisdiction: European Union (EU)`, public access disabled, size 0 B. De bucket **niet opnieuw aanmaken of verwijderen**.
- Via gekoppelde Cloudflare REST API geeft GET bucket met `cf-r2-jurisdiction: eu` nog 404/10006. Dit betekent dat de huidige connectorroute niet aantoonbaar bij deze EU-bucket kan, niet dat het dashboard ongelijk heeft.
- Bestaande Clean Core Worker-binding opnieuw bevestigd: `PREMIUM_PRIVATE` wijst naar de juiste naam met `jurisdiction=eu`; pilot `false`, accountallowlist leeg. Er zijn geen nieuwe uploadroutes uitgerold en geen gebruikersbestanden aangeraakt.
- Verifieer daadwerkelijke buckettoegang bij voorkeur via geïsoleerde, afgeschermde Worker-bindingtest of Cloudflare-dashboard, zonder de privacycontroles te omzeilen. Er is **nog geen werkende end-to-end Worker-R2-upload** aangetoond. Geen productietoegang openen zonder geverifieerde tests.

## Fase W — actieve Core Worker gecontroleerd (2 november 2026)
- Bestaande actieve Worker via Cloudflare GET content/v2 bekeken zonder deployment of wijzigingen. Scriptinhoud circa 67 KB inclusief multipartverpakking.
- Actieve script bevat `premiumRoutes` en `/api/me/entitlements`, maar **geen** `/api/premium/cloud/` route en geen `PREMIUM_PRIVATE` objectaanroep. De R2-binding is dus ingesteld, maar de upload-/downloadmodule is nog niet in het actieve script gemonteerd.
- Existing Worker subdomain enabled; previews disabled; actieve deployment bestaat. De pilot blijft uit en de whitelist leeg.
- Volgende concrete integratiestap: minimalistische patch van de bestaande Core-router op basis van geverifieerde brontekst en terugvalversie; behoud sessie-, origin-, rechten- en rate-limitfuncties. Eerst code+regressietests, dan pas staging-deployment, daarna fictieve upload/download via de Worker-binding. Niet blind 67 KB productie-/stagingcode vervangen of via gewone API EU-jurisdictie omzeilen.

## Fase X — bestaande Core-pilotroute teruggevonden (2 november 2026)
- De **actieve** Core Worker blijkt al een afgeschermde synthetische testroute te bevatten: `/api/me/premium/cloud/pilot` met GET, POST en DELETE. De route controleert bestaande sessie, pilotflag, expliciete accountallowlist, handmatig Premium-testrecht, origincontrole voor schrijfacties en rate limiting. POST genereert serverzijdig fictieve testgegevens en controleert R2 direct na de upload.
- Cruciaal: deze route gebruikt nog `env.PREMIUM_MEDIA` (historische bucket `talera-core-media`), **niet** `env.PREMIUM_PRIVATE` (jurisdictie EU). Een geslaagde test van de huidige route zou daarom de nieuwe privé-EU-opslag niet bewijzen.
- Minimale vervolgaanpassing: **uitsluitend binnen deze bestaande testroute** de drie R2-acties en de bindingcontrole omzetten van `PREMIUM_MEDIA` naar `PREMIUM_PRIVATE`, met dezelfde sessie-/pilot-/allowlist-/rechtenchecks en dezelfde synthetische fixture. Niet alle andere Worker-routes wijzigen en geen tweede pilotroute bouwen.
- Leg vóór deployment de huidige Worker-versie vast voor rollback, test syntaxis en regressie, en houd `PREMIUM_CLOUD_PILOT_ENABLED=false` totdat alleen een aangewezen technisch testaccount is toegelaten. Dit is nog **niet uitgerold**.
- De EU-bucket is door de gebruiker in het dashboard bevestigd met `Jurisdiction: European Union (EU)`; de Cloudflare-connector geeft bij directe R2 REST-aanvraag nog 404. Test daarom via de Worker R2-binding, niet via de onbetrouwbare directe connectorroute.

## Fase Y — bestaande synthetische pilot voorbereiden voor EU R2 (2 november 2026)
- Via Cloudflare is de actieve Clean Core-bron opnieuw gelezen. De bestaande `premiumCloudPilotRoutes` bevat precies acht `env.PREMIUM_MEDIA` verwijzingen; buiten die route zijn geen aanroepen naar deze binding aangetroffen.
- `src/core/premium-eu-pilot-patch.mjs` toegevoegd: een fail-closed, strikt afgebakende bronpatch voor precies deze acht verwijzingen binnen de bestaande synthetische route. `test/premium-eu-pilot-patch.test.mjs` bevat twee controles; de testworkflow is uitgebreid.
- De patch is nog niet op de actieve Worker toegepast; er is nog geen nieuwe deployment, geen fictieve upload via de EU-binding en geen gebruik van persoonlijke herinneringen. Pilotflag en allowlist blijven ongewijzigd.
- Vóór deployment: actuele Worker-source bewaren als terugvalversie, diff van uitsluitend de testroute controleren, tests uitvoeren en de echte R2-binding test via een aangewezen testaccount. Niet de normale klantcloud openstellen.

## Fase Z — daadwerkelijke patch-dry-run tegen actieve Core Worker (2 november 2026)
- Actieve Clean Core deployment bevestigd, vorige deployment-ID blijft als Cloudflare-terugvalhistorie aanwezig. Pilotflag nog steeds `false`, allowlist leeg; `PREMIUM_PRIVATE` binding verwijst naar `talera-premium-private-eu-staging` met `jurisdiction=eu`.
- De werkelijk uitgevoerde in-memory dry-run op Cloudflare GET content/v2 bevestigt: huidige multipart-brontekst 67.227 tekens; bestaande synthetische pilotroute start bij 29.140 en eindigt bij 32.836; precies acht `env.PREMIUM_MEDIA`-verwijzingen binnen die route, nul buiten de route. De voorgestelde vervanging raakt alléén deze acht verwijzingen; overige bron onveranderd. Resultaat `safe: true`, `deployPerformed: false`.
- GitHub-plugin toont nog geen PR-commit-workflowresultaten; op eerder gedeeld GitHub Actions-dashboard waren recente runs groen. Dat is niet hetzelfde als gecontroleerde deploy van deze patch.
- Geen workerdeployment of EU-objectupload uitgevoerd. Voor veilige uitrol eerst volledige bronversie terugvalbaar vastleggen, correcte multipart-/moduledeployment verifiëren en vervolgens pilot bewust voor uitsluitend fictief testaccount activeren. Nooit een nieuwe R2-bucket aanmaken of live Free-flow wijzigen.

## Fase AA — staging Core Worker succesvol gepatcht (2 november 2026)
- Met Cloudflare API `PUT /workers/scripts/talera-clean-core-staging-20261030/content` (vervangt uitsluitend Worker-scriptcontent, niet settings) bestaande synthetische pilotroute bijgewerkt: precies **acht** `env.PREMIUM_MEDIA` aanroepen naar `env.PREMIUM_PRIVATE`. Bronlengte 66976 -> 66992 tekens, de rest ongemoeid. Cloudflare antwoordde `success:true`, nieuwe deployment-ID `d5b4c0719f3c4aea8005d61c784a2db0` (API-return), deploymentlijst bevat ook nieuwe ID `1b391e3d-a7d3-43e7-8865-27f07c2f55dd` (mogelijk onderscheid tussen versie-/deployregistratie).
- Herlezing na deployment: exact acht `env.PREMIUM_PRIVATE` verwijzingen in pilotfunctie, nul `env.PREMIUM_MEDIA`. De aanwezige bindings `DB`, `PREMIUM_MEDIA`, `PREMIUM_PRIVATE`, `SHARE_MEDIA` behouden; `PREMIUM_PRIVATE` verwijst naar `talera-premium-private-eu-staging` met `jurisdiction=eu`.
- Veiligheid na deployment opnieuw bevestigd: `PREMIUM_CLOUD_PILOT_ENABLED=false` en `PREMIUM_CLOUD_PILOT_ACCOUNT_IDS=''` (leeg). De pilot is dus nog afgesloten; geen echte upload/download via testaccount uitgevoerd, geen persoonlijke gegevens gewijzigd.
- Bestaande Cloudflare-Workerhistorie is bewaard; vóór het activeren van de pilot opnieuw verifiëren dat beheerder een specifiek fictief testaccount aanwijst en testresultaten worden teruggelezen. Payment en Free-ongewijzigd.

## Fase AB — gesloten pilot en testrechtendatabase geverifieerd (2 november 2026)
- Cloudflare Core Worker bindings opnieuw uitgelezen: `PREMIUM_CLOUD_PILOT_ENABLED=false`, allowlist leeg, `PREMIUM_PRIVATE` jurisdictie `eu`.
- Bestaande staging D1 read-only query `SELECT count(*) AS total FROM talera_premium_test_grants` succesvol uitgevoerd: **0 rijen**. Er is dus geen bestaand Premium-testrecht voor een end-to-end gebruikersupload. Geen accounts of rechten aangemaakt.
- `test/premium-eu-pilot-http-smoke.mjs` toegevoegd: gecontroleerde anonieme GET op de bestaande pilot-URL, assert 401; alleen uit te voeren met expliciet opgegeven HTTPS-staginghost. De test is nog niet tegen een live endpoint uitgevoerd.
- Voor upload/download via daadwerkelijke Worker-sessie: gebruiker kiest bestaand niet-persoonlijk testaccount (of autoriseert veilige aanmaak), admin verleent tijdelijk `manual_test`-recht, alleen dat account wordt geallowlist, dan expliciete staging pilot aan/uit, synthetische POST/GET/DELETE en cleanup met uitgeschakelde pilot als eindstatus.

## Fase AC — sessiecontrole bij cloudtest: zelfde TALERA-origin gebruiken (2 november 2026)
- Gebruiker opende de losse Core-Worker-URL `...workers.dev/api/me/premium/cloud/pilot` vanuit mobiele ChatGPT-link en zag `401: Aanmelden bij TALERA is nodig`. Dit is een correcte afwijzing zonder TALERA-sessiecookies op dat aparte hostadres, **geen fout in het testaccount**.
- Gecontroleerd in actieve PWA-route: V62 Worker stuurt standaard verzoeken door naar bestaande V56 service; V56 stuurt `'/api/'` verzoeken inclusief bestaande headers/cookies door naar `CLEAN_CORE` service. De Core Worker herkent de sessie dus via **dezelfde origin als de ingelogde TALERA-PWA**.
- Gebruikerscontrole: ga in exact dezelfde browsertab waar `sales@swimm.nl` in TALERA is ingelogd naar `/api/me/premium/cloud/pilot` op het **bestaande TALERA-adres**, niet naar de Core `workers.dev` URL of een nieuw browservenster. Bij geldige sessie en gesloten pilot verschijnt naar verwachting `404 Cloudproef is niet actief`; een `401` zou op een ontbrekende sessie wijzen.
- Geen nieuwe login/cookiesysteem, geen extra worker, geen cloudpilotactivatie nodig. Maak de test via dezelfde origin toegankelijk vóór een eventuele tijdelijke, afgeschermde POST/GET/DELETE pilot.

## Fase AD — PWA-knop voor EU-cloudtest daadwerkelijk uitgerold (2 november 2026)
- Binnen de bestaande V62-PWA onder **Mijn abonnement** voor een ingelogde gebruiker met `manual_test` en cloudopslagrecht één knop `EU-cloudopslag testen` toegevoegd, direct in `src/mijn-talera/menu-integration.txt`. Geen losse technische URL en geen nieuw inlogsysteem.
- Klik start uitsluitend na bevestiging de bestaande synthetische Core-Worker-test: POST schrijft fictieve herinnering, GET verifieert opslag, DELETE ruimt op; bij gedeeltelijke fout probeert de knop het object ook te verwijderen. Bij uitgeschakelde pilot verschijnt een begrijpelijke melding; gewone herinneringen blijven ongemoeid.
- Via Cloudflare `PUT /workers/scripts/talera-pwa-v62-mijn-profiel-20261101/content` alleen de `menu-integration.txt` module in de bestaande multipart-Worker geactualiseerd. Cloudflare meldde succesvolle deployment `91ab7490df454cd6be1b92e4758c3b68` (2 november 2026 15:50 UTC). Bestaande onderdelen `free-backup.txt`, `kennisbank.html` en `worker.mjs` behouden; binding `V56_BASE` onveranderd.
- Nacontrole actieve Cloudflare-bron: één knop, één clickhandler, één pilot-API-pad. PWA-menu exact identiek aan GitHub-bron (lengte 50.130 tekens, FNV1a `9d7f97f6`), GitHub commit `cae8ca3e4f19792355dcb493e455a06d80e13881`. Testworkflow uitgebreid met JS-syntaxcontrole van menu-script (commit `2ab738c8c6eb5878dcd8671bbca609f6b8f64966`).
- Core pilot blijft **uit** (`PREMIUM_CLOUD_PILOT_ENABLED=false`, whitelist leeg); eerste veilige schermtest moet daarom de gesloten-pilotmelding opleveren in de ingelogde PWA. Er is nog geen echte opslag-/downloadcontrole gedaan, en geen gebruikersdata gebruikt.

## Fase AE — EU-cloudpilot voor één testaccount geopend (2 november 2026)
- Gebruikersscreenshot V62 bevestigt Premium Individual, knop EU-cloudopslag testen en terugmelding dat de beveiligde cloudproef nog uit stond. De ingelogde PWA-origin werkt.
- Na Cloudflare preflight uitsluitend de twee bestaande pilotinstellingen geactiveerd voor account sales@swimm.nl: PREMIUM_CLOUD_PILOT_ENABLED=true; PREMIUM_CLOUD_PILOT_ACCOUNT_IDS bevat exact de UUID b70d49a4-0c94-4964-9024-0c44521b5ccf.
- Directe herlezing: alle zes oorspronkelijke Worker-bindings qua inhoud behouden, allowlist exact één account, private bucket nog steeds EU-jurisdictie. Geen nieuwe Worker, DB of bucket gemaakt.
- Gebruiker moet nu via de knop in de aangemelde PWA fictieve POST/GET/DELETE testen; er is nog geen succesvolle objectuitwisseling bevestigd.
- **Verplichte cleanup na test of bij afbreken:** PREMIUM_CLOUD_PILOT_ENABLED weer false en PREMIUM_CLOUD_PILOT_ACCOUNT_IDS leeg maken, andere bindings onaangeroerd laten. Niet onbeperkt open laten staan.

## Fase AG — echte privé-cloud API en eerste automatische media-sync aangesloten (2 november 2026)
- De bestaande Clean Core Worker is minimaal uitgebreid met vijf hergebruikte GitHub-modules via één multipart Worker-update; bestaande sessie, accountrechten, origincontrole en rate limiting blijven maatgevend. Core Worker deployment ID: 28e649fa855c4f55a7dcf9ad7913af81.
- Nieuwe private API routes zijn in de bestaande Core-router opgenomen: GET/POST /api/premium/cloud/consent, GET /api/premium/cloud/media, GET/PUT /api/premium/cloud/media/:mediaId. De adapter laat alleen het expliciet toegestane, handmatig Premium-testaccount toe. De entitlement-weergave geeft cloudbeschikbaarheid alleen tijdens de afgeschermde pilot aan.
- De bestaande TALERA V62 PWA serveert nu de hergebruikte `premium-sync-coordinator`, `premium-sync-queue` en read-only `premium-indexeddb-bridge` vanuit dezelfde Worker. De PWA bevat een eenmalige toestemmingsknop die uitsluitend verschijnt als de pilot voor dat account actief is; lokale Free-data worden niet verwijderd of gewijzigd.
- Na toestemming probeert de PWA automatisch media te synchroniseren, controleert serverrechten en toestemming voor ieder uploaditem en hervat bij PWA-opstart, accountwijziging en terugkerende internetverbinding. De huidige pilot ondersteunt alleen mediabestanden tot 25 MiB, één voor één; dit is bewust nog geen complete Free-naar-Premium-migratie.
- V62 PWA deployment ID: 7827cefe20734899b5ab4dfb99ece120. Cloudflare nacontrole bevestigt dat de eenmalige toestemming, autoresume en drie mediabronmodules zijn uitgerold; Free-back-upbron blijft behouden. Pilot staat op false en allowlist leeg na deployment.
- **Openstaande functionele stukken:** verhalen en lokale historische reacties synchroniseren, grote video-/mediabestanden veilig in delen uploaden, en een volledige telling/integriteitscontrole vóór melding 'alle herinneringen klaar'. Tot die tijd geen volledige Premium-cloudmigratie claimen; billing blijft gesimuleerd met de bestaande handmatige testrechten.

## Fase AH — eenmalige-toestemmingstest gereed voor sales-account (2 november 2026)
- Alleen voor account sales@swimm.nl is de bestaande Premium-cloudpilot opnieuw geactiveerd (allowlist exact één account); overige zes Worker-bindings zijn onveranderd, EU-jurisdictie nog correct.
- Staging D1 read-only gecontroleerd: één geldig handmatig Premium-testrecht, maar nog **geen** opgeslagen cloudtoestemming (consent_count=0). Er kan daarom nog geen lokale mediabatch naar de private cloud worden gestuurd. Toestemming moet expliciet in TALERA worden gegeven.
- In de V62-PWA verschijnt voor dit account onder Mijn abonnement de nieuwe knop 'Eenmalig toestemming geven voor EU-cloudopslag'. De synchronisatie verwerkt voorlopig mediabestanden, verhalen en historische reacties en grote media moeten nog worden toegevoegd.
- **Verplichte afsluiting:** na de gebruikerscontrole / mislukte test de pilot weer uitschakelen en allowlist leegmaken, met GET nacontrole. Betaalstap blijft gesimuleerd.

## Fase AI — accountgrens van apparaatarchief hersteld (2 november 2026)
- Tijdens stagingreview vastgesteld dat Free IndexedDB `talera-lifeline-dev-local-v1` één apparaatarchief is, zonder automatisch bewezen per-accountbezit. Daarom mag de PWA dit niet blind onder het ingelogde Premium-testaccount uploaden.
- De tijdelijke pilot onmiddellijk teruggezet op false en de allowlist geleegd **vóór toestemming/upload**. Er was volgens staging D1 nog geen toestemming voor sales@swimm.nl opgeslagen.
- V62 PWA vraagt bij eenmalige toestemming expliciet of ALLE lokale herinneringen op dit apparaat bij het ingelogde account horen. Na akkoord wordt de lokale account-eigenaar gekoppeld en alleen voor hetzelfde account hervat. Een ander account op hetzelfde apparaat wordt geblokkeerd. Vrijblijvende automatische koppeling is verboden.
- Extra beveiliging bij elk mediabestand: server geeft het geverifieerde eigen accountId mee aan `/api/me/entitlements`; synccoordinator controleert dit naast de lokale eigenaarkoppeling, ook bij accountwisseling tijdens een batch. Testgevallen voor accountmismatch toegevoegd.
- Cloudflare Core deployment d4b5ee21caf8427ea41ee65ff787493c, V62 PWA met definitieve accountcontrole 19f70a45b2c04d89be6faa47f1259f52. Nacontrole bevestigt beide guards aanwezig, Core privéroute aanwezig, pilot uit en allowlist leeg, EU binding correct.
- De volgende fase moet verhalen, historische reacties en grotere media meenemen, vervolgens pas volledige migratie en synchronisatie met een expliciete gebruikerstoestemming in de PWA testen. Niets overgedragen aan het testaccount tijdens deze bouwfase.

## Fase AJ — privé-archief voor Free-verhalen en historische reacties aangesloten (2 november 2026)
- Bestaande Free-bron gecontroleerd: verhalen uit IndexedDB-store `stories`, archiefreacties uit `files` met sleutelprefix `talera-thread-archive-v1:`. De leesbrug `src/mijn-talera/premium-records-bridge.mjs` leest beide stores uitsluitend read-only. Archiefreacties zijn inerte privékopieën, niet opnieuw gepubliceerde socialereacties.
- Een extra private recordmanifesttable `talera_premium_records` is op de bestaande staging D1 aangebracht (migratie `migrations/20261102_premium_private_records.sql`) en de aanwezigheid van de tabel is via Cloudflare bevestigd. Geen tweede database of Worker.
- Core `premium-private-records.mjs` bouwt voort op dezelfde geauthenticeerde, geallowliste en expliciet geconsenteerde `/api/premium/cloud/*`-route. `PUT/GET /records/{story|comment_archive}/{uuid}` en gepagineerde `GET /records` bewaren content-gehashte immutable JSON-snapshots in dezelfde private EU R2-bucket met een manifest in D1. Payload max 1 MiB per record; geen Free-record of sociale reactie wordt gewijzigd.
- Worker Core staging deployment `70bd3f89c0d1469a99ed197731d4346d`, vorige deployment `99bc0df3-c1ce-4977-8b47-683198ddb737` als terugval. PWA `premium-records-coordinator.mjs` gebruikt de bestaande één-voor-één queue, hercontroleert rechten, account en consent en haalt het recordmanifest op met cursorpaginering.
- V62 PWA deployment `ad7369b6cb7049b9abce983fc857257e`, daarna save-event upgrade `734f31a8b08446a28e4eb7147b52e690` (vorige deploymenthistorie blijft behouden). De PWA rapporteert media- en recordvoortgang afzonderlijk en reageert op bestaande `talera:v9-memory-saved`, `talera:new-memory-landed`, `talera:storylab-memory-landed` events, naast heropenen/internet-herstel.
- De extra unit-/mocktests voor recordintegriteit, rechten, accountisolatie en offline gedrag zijn op de GitHub-branch toegevoegd en aan CI verbonden; daadwerkelijke CI-resultaten en een echte telefoon-naar-EU-upload van een verhaal zijn nog niet bevestigd.
- Cloudflare-nacontrole: beide staging Workers bevatten de recordsmodules, `talera_premium_records` bestaat, Free-back-up aanwezig, alle zes Core-bindings ongewijzigd, EU-jurisdictie correct, pilotflag false en allowlist leeg.
- **Openstaande beperkingen:** bestaande media-upload limiet 25 MiB, individuele recordlimiet 1 MiB; grote video-overdracht en een volledige consistente herstel-/integriteitscontrole nog bouwen. Zeg niet 'alle herinneringen volledig gemigreerd' voordat deze zijn getest.
- Belangrijk bij losse Worker-stagingdomeinen: IndexedDB is per weborigin geïsoleerd. Een op een ouder PWA-domein opgeslagen Free-bibliotheek is niet automatisch zichtbaar op de nieuwe V62-URL; behoud de oude installatie en gebruik de bestaande Free-back-up/herstelfunctie voor gecontroleerde overdracht. In de toekomstige vaste TALERA-origin treedt dit versie-domeinprobleem niet op.

## Fase AK — volledige manifestpaginering en eerlijke auditstatus (2 november 2026)
- Gevonden en opgelost: de vorige private media-lijst gebruikte `LIMIT 200` zonder paginering; bij grotere bibliotheken kon een coordinator onterecht records missen. De bestaande Core-route `GET /api/premium/cloud/media` geeft nu cursorgebaseerd op media_id batches tot 500 terug; het media-synccoordinator leest alle pagina's (maximaal 1.000), met cursor- en formaatcontroles. Geen tweede database of Worker.
- De bestaande `files`-store wordt nu extra alleen-lezen geïnspecteerd door `inspectPremiumLocalFileCoverage`: uploadbare media, media boven de 25 MiB pilotgrens, niet-ondersteunde bestanden, historische commentaararchiefbestanden. Te grote en onbekende bestanden worden niet langer stilzwijgend genegeerd bij de volledigheid.
- Nieuw `src/mijn-talera/premium-sync-audit.mjs`: na controle van serveraccount, Premium-rechten, cloudtoestemming en apparaat-eigenaarschap worden alle pagina's van beide private manifesten vergeleken met actuele Free-media en gehashte verhalen/reacties. Phase = `pending`, `needs_attention` of `manifest_matched`; alleen de serverregistraties worden vergeleken. `verifiedObjects:false` maakt expliciet dat nog geen complete R2-download/herstelproef is gedaan.
- Verhalen en reactiearchieven groter dan 1 MiB worden als te groot geteld; geen onjuiste status 'klaar'. Het bestaande Mijn abonnement-menu heeft voor het testpakket een optionele knop `Controleer volledigheid`, die ontbrekende mediabestanden, ontbrekende verhalen/reacties en alle uitgesloten bestanden toont. Bij accountwisseling wordt de lopende audituitkomst genegeerd.
- Nieuwe GitHub-tests voor >200 media-items, cursorfouten, geen lokale IndexedDB-toegang zonder toestemming of correcte accountidentiteit, offline gedrag en uitsluiten van te grote media toegevoegd aan de bestaande CI. De GitHub-connector kan de push-workflowstatus niet bevestigen, dus **geen CI-geslaagdclaim**.
- Core staging deployment `13c75ba4cee24ae5b4d9bc9194dac171`; PWA `39c3de6749ad48e0a85d6bef6e54f133`, gevolgd door account-wissel-guard `9512df6fa34749c6a7377af46edaa53b`. Cloudflare-nacontrole: media-paginering, auditmodule, knop, Free-back-up en kennisbank aanwezig; pilotflag uit, allowlist leeg, EU-jurisdictie behouden en zes Core-bindings aanwezig.
- Nog open: R2-objecten zelf integraal op controleerbare wijze verifiëren (bijvoorbeeld via inhoudscontrole of gecontroleerde terugzetproef), en veilige verwerking van grote foto's/video's boven de pilotlimiet. Betalingen blijven gesimuleerd. Bestaande Free-localdata niet verwijderen of overschrijven.

## Fase AL — grote video's in delen, hervatten en terugleescontrole (2 november 2026)
- Officiële Cloudflare R2 Workers multipart-documentatie geraadpleegd. De bestaande privé-EU-bucket en D1 blijven in gebruik. Cloudflare R2 multipart vereist minimaal 5 MiB per deel (behalve laatste), daarom vaste delen van 8 MiB. Stagingpilot ondersteunt nu media van >25 MiB t/m maximaal 2 GiB. Bestanden boven die grens blijven zichtbaar als nog niet ondersteund.
- Nieuwe migration `migrations/20261102_premium_multipart_media.sql` op bestaande staging-D1 uitgevoerd: `talera_premium_uploads`, `talera_premium_upload_parts` en `talera_premium_media.digest_kind`. Aanwezigheid en initiële 0 openstaande uploads door Cloudflare bevestigd; bestaande gewone mediaregistraties behouden digest_kind `full-sha256`.
- Bestaande Core Worker heeft nu `premium-multipart-media.mjs`: sessie- en accountafgeschermde start/status/deel/voltooien/afbreken-acties onder `/api/premium/cloud/multipart/:mediaId/*`. Elk deel op SHA-256 gecontroleerd; R2 ETags uit serverregistratie; na volledige partlijsten en een samengestelde SHA-256-vingerafdruk komt de definitieve mediaregistratie in D1. `digest_kind=part-sha256-v1` onderscheidt deze part-root van een volledige bestands-SHA. Bestaande objecten worden niet overschreven en onderbroken eindregistraties kunnen worden hervat.
- `premium-large-media.mjs` in bestaande V62-PWA gebruikt Blob.slice tot maximaal 8 MiB per keer, maakt een stabiele inhoudsafhankelijke media-ID en hervat alleen ontbrekende delen via een server-side status. De reeds bestaande uploadqueue, eenmalige toestemming, accountcontrole en cloudpilot-toegangscontrole blijven gelden. Gebruiker kiest geen bestanden afzonderlijk.
- De Core Worker biedt voor expliciete readback-verificatie streng begrensde bytes-ranges (max 8 MiB), met HTTP 206 en content-range. In de PWA is de expliciete knop `Controleer teruglezen` onder Mijn abonnement toegevoegd. De read-only `premium-restore-verifier.mjs` vergelijkt media per deel en verhalen/reacties volledig op SHA-256 met het lokale originele Free-archief; zonder lokale gegevens te overschrijven. Dit is een inhoudelijke terugleescontrole, nog niet een compleet UI-proces om het hele archief vanaf de server naar een leeg apparaat te herstellen.
- De bestaande Core rate limiter stond op 30 writes per 10 minuten per IP, onvoldoende voor een grote video. Alleen multipart-delen gebruiken nu een aparte per-IP/per-account categorie met grens 600 per 10 minuten. Consent en gewone Premium/TALERA-writes behouden de eerdere strengere limiet.
- Nieuwe mock-/moduletoetsen in de bestaande GitHub CI: 26 MiB fictieve video in 4 stukken; hervatten na mislukte deelupload; hash-/accountbeveiliging; R2-range validatie; readback van media/verhaal en detectie van corrupte media. **Het echte testresultaat in GitHub CI is nog niet via de koppeling bevestigd**, en er is nog geen echte grote-video-upload via het ingelogde testaccount uitgevoerd.
- Staging-uitrol bevestigd via Cloudflare: Core staging multipart deployment `8affe9edf1844853a6ec41d9f41e64cb`, readback deployment `adb09c774967409a9713556d497a6d55`, herstel van onderbroken voltooiing `107dd26ad1b84ea89bd49d3909d60203`, part-rate-limiet `5efa070c7c6149f5984ebcaff7a0c722`. V62 staging clientvideo deployment `1a811f3b98e44e479174e5910bcf224e`, terugleesknop `e5494c7d45d54db7b8979aa503a3012b`. Bestaande Workerhistorie is de fallback.
- Na-uitrol Cloudflare-inspectie: alle acht Core-modules en twaalf PWA-onderdelen aanwezig, Free-back-up en kennisbank behouden, bestaande zes Core-bindings onaangetast, EU-jurisdictie `eu`, `PREMIUM_CLOUD_PILOT_ENABLED=false` en allowlist leeg, D1 nieuwe tabellen aanwezig en 0 open uploads.
- **Nog te bewijzen** voordat 'volledige migratie klaar' wordt getoond: één echte gecontroleerde video van >25 MiB via de telefoon met tijdelijk testrecht, geslaagde hervatting bij verbindingsverlies, volledige objectreadback, en een later apart herstelproces naar een leeg apparaat. Betaling blijft gesimuleerd en wordt niet gekoppeld.

## Fase AM — automatische CI-testreeks hersteld en geverifieerd (2 november 2026)
- Via de GitHub Actions REST-API de echte push-runstatus opgehaald in plaats van de (alleen pull-requestruns teruggevende) connectoractie `fetch_commit_workflow_runs`. Daarbij bleek de eerdere reeks **niet groen**: 90/91 moduleslagen; één verouderde test verwachtte nog dat 26 MiB video boven de uploadlimiet viel.
- De code kan sinds de vorige fase media boven 25 MiB via R2 multipart tot 2 GiB verwerken. De oude test `test/premium-sync-audit.test.mjs` is daarom gecorrigeerd: de 26 MiB video telt als ondersteund maar nog niet op de server, niet langer als 'te groot'. Commit `d1d7c30e7a792b8cf267b3b374e48f6a10e2c9cf`.
- Nieuwe GitHub push-run `41490036523` op dezelfde featurebranch is **volledig geslaagd** volgens GitHub API: status `completed`, conclusion `success`. Alle jobstappen inclusief Node module-/beveiligingstests, TALERA-menu-syntax en gesloten-pilot HTTP smoke hebben conclusie success. Zie `https://github.com/Marksmits1972/talera-lifeline/actions/runs/41490036523`.
- Cloudflare-nacontrole herhaald: Core R2 multipart route, aparte per-account part-rate-limiter, begrensde readback GET, PWA large-media en restoreverifier actief. Free-back-up aanwezig. Pilotflag `false`, allowlist leeg, EU R2 binding `eu`, 0 open multipart uploads, 0 parts en 0 opgeslagen cloudtoestemmingen op staging.
- **Eerlijk testonderscheid:** automatische tests met fixtures en de gesloten-pilot HTTP smoke zijn geslaagd. Nog geen echte 26 MiB video via ingelogde PWA naar staging R2 geüpload, onderbroken en teruggelezen. Ook nog geen leeg-apparaat herstel. Blijf user-data uit de test houden; bij een latere doelgerichte pilot uitsluitend synthetische data of expliciet geselecteerde testdata gebruiken.
