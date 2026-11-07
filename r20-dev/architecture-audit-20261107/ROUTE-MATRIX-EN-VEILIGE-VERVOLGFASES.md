# TALERA — technische routekaart en veilige vervolgfases

**Datum:** 7 november 2026  
**Status:** uitsluitend onderzoek, NIET uitgerold, geen code- of servicewijziging.  
**Bronnen:** Google Drive onderzoeksrapport 2 (softwarelagen, 7 november), uitvoeringsrapport vijf talen/onderhoud (7 november), centraal PWA-linkregister, huidige GitHub Worker-bronnen en QA-documenten. Deze rapportage corrigeert de aanname dat een Worker-telling gelijkstaat aan aantoonbaar dubbele techniek.

## Versies strikt onderscheiden

| Rol | Vastgelegde versie / bron | Status |
| --- | --- | --- |
| Huidige **officiële voorkeurs-PWA** in centraal register | `talera-account-birthdate-test-20261107` — `feature/account-birthdate-timeline-20261107` | Door gebruiker eerder als beste aangewezen; niet automatisch vervangen |
| Onderhoudskandidaat met vijftalige reparaties | `talera-vijftalen-onderhoud-test-20261107` — `feature/maintenance-five-languages-and-safe-fixes-20261107` | Gescheiden testorigin; account-/DOB-reparaties statisch en synthetisch getest |
| Latere visuele proef | `talera-design-cleanup-fase4-test-20261107` — `feature/design-only-timeline-rail-css-cleanup-phase4-20261107` | Onafhankelijke testorigin, voor iPhone-beoordeling aangeboden; niet automatisch hoofdlink |
| Onderliggende eerder goedgekeurde vertelcyclus | `talera-closed-memory-core-test-20261106` en aparte diepblauwe kandidaatkoppeling | Historische herstelpunten; **niet overschrijven** |

Verschillende `.workers.dev`-hostnamen hebben **verschillende lokale** IndexedDB/localStorage. Nieuwe testorigin is géén datamigratie en evenmin een nieuwe officiële voorkeursversie.

## 1. Inventaris van de 13 bereikbare Worker-services (audit 7 november)

De oorspronkelijke audit vond **13 verschillende bereikbaar gekoppelde Workers** op de toenmalige accountgeboortedatum-route. Dit is een **servicegraaf met een vertakking**, geen bewijs dat elke HTTP-aanvraag in serie door alle 13 gaat. De onderstaande functienamen zijn uit de audit; ze zijn niet allemaal opnieuw met actuele Cloudflare-bindings uitgelezen tijdens deze uitsluitend-GitHub-vervolginspectie.

| Nr | Servicegroep uit eerdere audit | Belangrijkste functie / beschermde grens | Voorlopig oordeel |
| --- | --- | --- | --- |
| 1 | Account-geboortedatum | Registratie-uitbreiding, eigen DOB-profiel, geboorteankers | **Bewaren** zolang accountscenario niet end-to-end is gevalideerd |
| 2 | Closed-memory diepblauw | Eén bestaande presentatielaag met beschermde vertelcyclus | **Niet aanraken** (audio, video, mediacues) |
| 3 | Stijl diepblauw | Contentstijl, styling, tijdlijndichtheid, weergave | Alleen visuele, geïsoleerde opschoning |
| 4 | V9 verwijderen | Historische verwijderflow | Eerst gedrag en data-effecten traceren |
| 5 | V8 vertelstart | Opstart zonder flits | Nog geen bewezen duplicaat |
| 6 | V7 fotostrip | Isolatie fotostrip/bediening | Behoud zonder gesture-/swipetest |
| 7 | V6 verwijderknop | Verwijderbediening | Behoud zonder destruktieve testisolatie |
| 8 | V5 rechtstreeks bewerken | Directe bewerkroute | Behoud zonder edit-/publishregressie |
| 9 | V61 R20 herstelpunt | Goedgekeurde functionele basis | **Herstelpunt behouden** |
| 10 | V61 Instellingen/opslag | Instellingen- en opslaglaag | Eerst binding en datacontract traceren |
| 11 | V56 WhatsApp/foto/social | Delen/foto/social en vertakking naar core | Eerst route- en servicegrafiek bewijzen |
| 12 | V45 TALERA/WhatsApp | Onderliggende social-/deelroutes | Nog geen bewezen duplicaat |
| 13 | Clean-core staging | Accounts, eigen data-API en opslag | **Hoog risico**: account- en opslagcontract |

**Besluit:** op basis van de huidige bewijsvoering is er **geen Worker aan te wijzen die zonder risico verwijderd of samengevoegd kan worden**. Het aantal Workers is een onderhoudssignaal, niet het bewijs van overbodige code.

## 2. Technische routering die rechtstreeks in GitHub is bevestigd

### Accountgeboortedatum-Worker (oorspronkelijke voorkeursbranch)

Bestand `r20-dev/account-birthdate-test/account-birthdate-worker.mjs` bevat een router die deze paden afzonderlijk behandelt:

- `GET /__clean/menu-integration.mjs`: **exacte vervanging** van één registratiepayload om `birthDate` mee te sturen; wijkt bron af, dan 503 in plaats van stilletjes ongecontroleerd wijzigen.
- `POST /api/register`: gegevens eerst naar bestaande accountsystemen (`env.TALERA_BASE`), daarna privé-DOB in afzonderlijke D1.
- `GET /api/me` en `GET/POST /api/profile/birthdate`: privéprofiel bij actieve sessie.
- `GET /`, `/mijn-leven`, `/present`, `/instellingen`, `/account`: HTML-verbetering; voor twee tijdlijnen gepersonaliseerde startwaarden waar mogelijk.
- Alle overige verzoeken: doorgestuurd naar `env.TALERA_BASE`; geen vervanging van originele mediaservice.

### Onderhouds-Worker (latere, parallelle kandidaattak)

`r20-dev/maintenance-test/talera-maintenance-worker.mjs` heeft **dezelfde kernrouter en DOB-functies**, aangevuld met vijf talen, accounteditor-correctie, herstelbaar DOB-opslagfoutpad, diagnostische ankerstatus en CSS-correctie. Daarnaast behandelt de wrapper o.a. `GET /tell`, `/gedeeld` en `/meldingen` voor beperkte taalweergave. Het gebruikt eveneens `env.TALERA_BASE` als onderliggende service.

**Belangrijk:** deze twee bronbestanden hebben deels dubbele functiedefinities, maar vormen **parallelle, verschillende testversies**. Niet twee elkaar opvolgende identieke account-Workers in een enkele requestketen. Het verwijderen van één van beide om 'dubbel' op te lossen zou meteen opgeslagen links/testherstelpunten kunnen breken.

### Stijl en vertelcyclus

- `r20-dev/brand-voorstel-d/style-worker-blue-content.mjs` schrijft visuele HTML/CSS bij en bevat specifiek `rewritePresentationDensity`: die verandert weergavelogica, dus niet classificeren als alleen dode CSS.
- `r20-dev/one-flow/one-flow.worker.mjs` verwerkt op **GET `/present`** een in-place aanpassing van de bestaande native presenter via exacte bronankers. Bij ontbrekende of gewijzigde ankers blokkeert deze bewust met 503; de modaliteit van media/audio/video is **kritiek en beschermd**.
- De vroege `wrangler.jsonc` van de closed-memory test benoemt de servicebinding `STYLE_BASE`. De diepblauwe bron-/QA-documentatie beschrijft `closed-core -> stijl -> V9-basis`. De exacte **huidige 13-delige live bindinggrafiek** is hiermee nog niet volledig geverifieerd.

### Fasen 1–4 CSS-tests

De later gebruikte fase-preview-Workers zijn **losse alternatieve instappunten** met één directe `TALERA_BASE`-binding naar de onveranderde onderhoudskandidaat; zij zijn niet als vier seriële extra lagen achter elkaar geschakeld. Het creëren van een test-Worker verhoogt het aantal bestaande releases, maar niet noodzakelijk de lengte van het productiepad.

## 3. Oorspronkelijke risico's — nu correct bijgewerkt

| Code | Concrete toestand per 7 november | Zekerheid / openstaand |
| --- | --- | --- |
| T1 — Bestaande account DOB-editor | Het foutieve `<h1>`-criterium is **in de onderhoudskandidaat gerepareerd**; detectie via bestaand uitlog-element | Synthetische DOM-test geslaagd; echte iPhone-sessie van bestaand account nog niet bevestigd; oorspronkelijke voorkeursbranch houdt oude implementatie |
| T2 — Registratie geslaagd, DOB-opslag mislukt | Onderhoudskandidaat houdt de geslaagde registratie/cookie in stand en retourneert `birthDatePending` in plaats van misleidende totale fout | Synthetische opslagstoring getest; externe backends niet gezamenlijk transactioneel; live geregistreerde accountketen niet end-to-end geverifieerd |
| T3 — Geboortetijdlijn-ankers | `personalizeHome()` vervangt tekstfragmenten zoals `year<1985`, `let current=1985`; `personalizePresent()` zoekt de exacte `LIFE_START`-bronregel | In onderhoudskandidaat alleen headerdiagnostiek `demo/applied/missing`; koppeling zelf blijft fragiel; nog geen stabiele configuratie-API |
| T4 — Verschillende PWA-origins | Lokale opslag blijft gescheiden tussen de vele testlinks | Geen aanwijzing dat data gewist is; wel risicovol om originele app te vervangen of lokale bestanden zonder back-up te migreren |
| T5 — iOS herstart/cache | Geen complete offline/update/standalone-acceptatietest | Niet behandelen als bewezen bug; wel belangrijke toekomstige test |
| T6 — Meerdere controllers | In verleden veel scripts/MutationObservers/handlers | Niets verwijderen zonder listenertrace en functionele tests; vooral presentatie/synchronisatie beschermen |
| T7 — i18n globale observer | De centrale vijf-talenstructuur is aangevuld met 55 vertalingen in onderhoudskandidaat | Geen aantoonbaar performanceprobleem; geen tweede vertaalregister aanmaken |

## 4. Aanbevolen fases, in veilige volgorde

**Technische fase A — uitsluitend route-/contractinventarisatie, nul app-mutaties.** Via GitHub een read-only testmatrix van publieke GET-routes en headers op **de exact geregistreerde voorkeurs-PWA én afzonderlijke onderhoudskandidaat**. Controleer `/mijn-leven`, `/present`, `/tell`, `/__clean/menu-integration.mjs`, anonieme `/api/me` en anonieme `/api/profile/birthdate`. Leg per route vast: status, aangebrachte technische headers, aanwezige script-ID's, welke Worker een wijziging claimt en welke requests slechts worden doorgestuurd. Geen accounts aanmaken, geen geheimen uitlezen, geen media uploaden, geen database writes en geen huidige Worker redeployen. Uitsluitend na apart akkoord uitvoeren.

**Technische fase B — herstelpad DOB en persoonlijke tijdlijnen op echte testaccount.** Echte ingelogde iPhone-test voor registratie/uitloggen/inloggen/ontbrekende DOB/opslagstoring en exact geboortejaar/dag in beide tijdlijnen, met goedgekeurde testidentiteit; vóór enige codewijziging. Account-/D1-operaties zijn potentieel permanent en vereisen expliciete gebruikerscontrole.

**Technische fase C — bronanker-afhankelijkheid verwijderen (afzonderlijke kandidaat).** Ontwerp een expliciet DOB/tijdlijnconfiguratiecontract zodat home- en presentatiecontrollers dezelfde geboorteinformatie krijgen zonder fragiele codevervanging. Deze wijziging raakt functionele logica, is **niet design-only** en moet worden beoordeeld tegen beide bestaande tijdlijnen en op echte iPhone; het is geen standaardklus.

**Technische fase D — mogelijke Worker-consolidatie (laatst).** Eerst actuele servicebindingsgraph per request en exacte taken/headers/caches/responsewijzigingen vastleggen. Pas dan per bewezen redundant segment: single-purpose prototype op nieuwe Worker, before/after responsevergelijking en volledige media-, account-, share- en iPhone-regressie; nooit de 13 lagen ineens ombouwen.

## 5. Bindende bescherming en acceptatie

- Er is **één zichtbare presentatielaag** met twee mogelijke afspeeltechnieken; geen nieuwe losse media-/Story Player of extra audio/video-renderer toevoegen.
- Eén originele centrale mediabibliotheek op stabiele media-ID's; cue-timestamps en handmatige fotowissels in vertelmodus behouden.
- De goedgekeurde terugpijl, 34px zichtbare cirkel, 45px klikvlak, glaswerking, gekleurde balken en datumuitlijning behouden.
- Geen aanpassingen aan tijdlijn-intensiteit, zoom, dichtheid, mediastroom, accountdata, serviceworker-cache, opslag of sociale bediening buiten een expliciet afgebakend ticket.
- Elke technische kandidaat via **GitHub**, eigen branch en eigen testorigin; geen merge, geen wijziging van de officieel beste URL en geen overschrijven/verwijderen van oude Workers zonder afzonderlijk gebruikersbesluit.

## Bewijsgrenzen van deze onderzoeksfase

Gebruikte bronnen: eerdere live audit + centrale versie-/uitvoeringsrapporten, gelezen GitHub-Workerbronnen en `wrangler.jsonc`. Er is in deze fase **geen** nieuwe 13-Worker live-bindingdump gemaakt en **geen** echte ingelogde iPhone-/registratie-/media-test uitgevoerd. Claims over de oorspronkelijke dertien Workers zijn dus een herleidbare momentopname, geen nieuw geverifieerd 2026-11-07 productiegraphbewijs. Alle beschreven vervolgstappen zijn voorstellen; deze onderzoeksbranch bevat uitsluitend dit document.

**Huidige beslissing:** geen technische samenvoeging uitvoeren voordat fase A is gecontroleerd en de gebruiker de volgende fase toestaat.