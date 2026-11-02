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
