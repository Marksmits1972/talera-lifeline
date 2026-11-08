# TALERA — twee gescheiden schaalbaarheidsdoelen en minimale testaanpak

**Besluit van de eigenaar:** 8 november 2026. **Status:** eisen vastgelegd; eerste reproduceerbare offline scenario's gemaakt; geen miljoenen echte gebruikers getest.

## 1. Eén opdracht en twee aparte uitslagen

| Onderdeel | Vastgesteld technisch doel | Wat moet de infrastructuur doen? | Nog te bewijzen |
| --- | --- | --- | --- |
| **TALERA Free** | **10.000.000 gebruikers** kunnen bedienen | Bestaande PWA-code, HTML, JS, assets en updates betrouwbaar afleveren; persoonlijke herinneringen volgens productontwerp op het toestel | Werkt de bestaande code daadwerkelijk zonder persoonlijke cloudopslag en blijft codeverdeling betrouwbaar bij grote gelijktijdige opstartpieken? |
| **TALERA Premium** | **1.000.000 gelijktijdig actieve gebruikers** | Dezelfde code plus accountgebonden cloudverhalen, zes foto's per herinnering, audio, video, uploads, rechten, databases en media op grote schaal | Kunnen de **werkelijke** Cloudflare-opslag, netwerkpaden, rechten en schaling dit verkeer aan zonder vastlopen of gegevensverlies? |

**Let op:** 10 miljoen Free-gebruikers is een doelgroepgrootte en betekent NIET automatisch dat 10 miljoen mensen exact dezelfde seconde klikken. Voor Premium is uitdrukkelijk **een miljoen tegelijkertijd actieve sessies** afgesproken, veel zwaarder dan een miljoen accounts of dagelijks actieve personen.

Ook Free mag enige anonieme serverlogica hebben, zoals het ophalen van de app. Het vereiste dat persoonlijke Free-herinneringen niet afhankelijk zijn van D1/R2 moet in de **daadwerkelijk uitgeleverde Free-code** apart worden gecontroleerd; het is nu een producteis, geen al bewezen platformeigenschap.

## 2. De nu gebouwde minimale testen — eerlijk gelabeld

### Free: 10 miljoen installaties / bezoekers (offline belastingsenvelop)

Script: `r20-dev/free-premium-scale-20261108/scale-model.mjs`

Met de **niet-gemeten aannames** 3 app-assets per bezoek en alle 10 miljoen bezoekers verspreid over een update-/openingsvenster van één uur, ontstaat de opdracht aan de CDN-/edge-laag: **ongeveer 8.333 asset-GET's per seconde**. Bij een extreem kort venster van 60 seconden: **500.000 asset-GET's per seconde**. Dit zijn wiskundige scenario's, geen daadwerkelijke Cloudflare-meting.

Het aantal requests dat de origin/Worker moet uitvoeren is **onbekend** zolang er geen echte CDN cache-hitratio is gemeten. Niet een aangenomen percentage van 99% voor een gemeten feit houden.

Extra technische vereisten voor Free: statische caching/versiebeheer, anonieme pagina en JS ophalen, geen per-account centrale databaseactie voor persoonlijk Free-geheugen, app herstarten op toestel, grote update-/installatiepiek.

### Premium: 1 miljoen gelijktijdig actieve sessies (offline belastingsenvelop)

Het model onderscheidt **gelijktijdige sessies** van HTTP-acties per seconde. **Voorlopige niet-gemeten activiteitenmix**:

- Per minuut opent 20% van de miljoen actieve gebruikers één herinnering: **circa 3.333 verhaalmanifesten per seconde**.
- Iedere geopende herinnering heeft **zes foto's**: **20.000 fotoverzoeken per seconde**.
- Iedere geopende herinnering start één audio: **circa 3.333 audioverzoeken per seconde**.
- Per minuut begint 1% van de actieve gebruikers een herinnering op te slaan, met zes foto's en één audio: **circa 167 verhaalwrites, 1.000 fotouploads en 167 audiouploads per seconde**.
- Samen in dit **onvolledige illustratieve scenario**: **28.000 HTTP-media-/verhaaloperaties per seconde**. Login, tokencontroles, video, streamsegmenten, retryverkeer, notificaties en andere API-calls zijn **niet meegerekend**.
- Extra stressgeval: als alle 1 miljoen gebruikers in 10 seconden één verhaal met zes foto's en één audio openen, wordt dat in een ongecachet eenvoudige opzet **800.000 zulke HTTP-operaties per seconde**. Dat is een extreem gelijktijdigheidsscenario en geen bewijs dat TALERA dit moet of nu kan verwerken.

**Onbekend en niet ingevuld:** werkelijke bestandsgroottes, audiolengtes, videobitrate, aantal D1-queries per request, werkelijke shardverdeling, cachegedrag, clientvoorladen, echte gelijktijdige uploadaantallen en de geobserveerde Cloudflare-prestaties. De eenvoudige rekenregels mogen deze ontbrekende gegevens niet verhullen.

### Echte anonieme basiscontrole (3 requests)

`public-readonly-smoke.mjs` haalt één keer per pagina de bestaande test-PWA `/mijn-leven`, `/present` en `/tell` op. Het script controleert 200 + HTML, meldt paginagroottes en cacheheaders en doet geen login, writes of bulkverkeer.

**Zelfs wanneer dit groen is, is geen enkel schaaldoel bewezen.** Het bewijst dan alleen dat drie bestaande openbare schermen vanaf één GitHub-runner bereikbaar waren.

### Herhaalbare controle in GitHub Actions

`scale-model.test.mjs` controleert de afgesproken aantallen, berekeningen, zes foto's, afzonderlijke Free- en Premium-logica, en het verplichte resultaat `fullScaleProven:false`. `run-offline.mjs` maakt een JSON-rapport als workflow-artifact. De tests voeren geen miljoenen HTTP-aanvragen uit en schrijven niets naar D1/R2.

## 3. Pas hierna: de ECHTE belastingtest in afzonderlijke staging

**Free — werkelijke schaalproef.** Neem precies de bestaande TALERA-code, maar een eigen testomgeving, controleer de aangeleverde bestanden en eigen netwerkcalls; meet vervolgens uit meerdere regio's oplopend het anoniem downloaden van code en assets. Simuleer tijdvensters voor 10 miljoen Free-gebruikers met gedistribueerde loadgenerators en realistisch cachegedrag. Meet HTTP-fouten, cache-hitratio, p95/p99 en Worker-CPU/kosten. Dit hoeft niet met tien miljoen echte accounts; het moet wel **de daadwerkelijk vereiste netwerkbelasting** aantoonbaar verwerken.

**Premium — werkelijke schaalproef.** Maak testaccounts en gescheiden fictieve verhalen in een aparte D1-/DO-/R2-stagingopslag. Voer de echte Premium-routes en volledige zes-foto+audio/video-scenario's uit. Bouw het aantal **gelijktijdig actieve, verzoeken uitvoerende** clients gecontroleerd op via 100, 1.000, 10.000, 100.000 naar 1.000.000. Controleer lezen, schrijven, streamen, mislukte requests, retry, rechten, database-hotspots, opslaguitbreiding, herstel en dataconsistentie. Gebruik echte verschillende mediagroottes zodra die beschikbaar zijn.

**Belastingtest alleen na aparte kosten- en veiligheidsgoedkeuring.** Bij een miljoen sessies zijn gedistribueerde generators, rate limits, een staging-quotacheck, Cloudflare-controle en mogelijk een verhoging van limieten vereist. Een gewone GitHub Actions-run met één miljoen variabelen is geen echte belastingtest. Vuur geen productiepieken op de officiële app af.

## 4. Voorlopige acceptatiecriteria (technisch voorstel, nog te bevestigen)

- De functionele TALERA-werking (vertellen, fotoband, dezelfde speler, audio/video, beveiliging en tijdlijn) blijft ongewijzigd en correct.
- De twee scenario's krijgen elk een **aparte uitslag**: aantal werkelijk geactiveerde clients, requests/s, p95/p99, percentage 4xx/5xx/time-outs, CDN-hits en kosten.
- Premium: geen onterecht accountoverschrijdende toegang; geen verlies van een als voltooid bevestigde upload of herinnering. Herstelbaarheid blijft aantoonbaar.
- Meet de echte piekbelasting gedurende voldoende tijd (richtlijn: minstens 15 minuten stabiel plus een afzonderlijke korte piek); controleer ook het herstel na terugschalen.
- **Voorlopig prestatievoorstel**: minder dan 0,1% onverwachte serverfouten en p95 onder 3 seconden voor niet-streamende app-/API-acties bij afgesproken testnetwerken; voor audio/video worden aparte starttijd- en bufferingseisen vastgesteld met echte bestanden. Dit zijn **voorstellen**, geen door de gebruiker definitief goedgekeurde normen en geen al gemeten resultaten.

Een echte geslaagde **Free-capaciteitsmeting** en een echte geslaagde **Premium-capaciteitsmeting** zijn allebei nodig om aan het oorspronkelijke projectdoel te voldoen. Geen architectuurkeuze (D1, meerdere D1's, Durable Objects of R2) telt als uitkomst zonder deze twee feiten.

## 5. Relevante platformlimieten en gevolgen

- Cloudflare Workers Paid heeft geen generieke verzoeken-per-seconde-limiet, maar wel CPU-, geheugen-, request-body-, netwerk- en overige limieten. **TALERA Free** is een gebruikerspakket; dat is iets anders dan een **Cloudflare Workers Free** abonnement (waarbij wél een daglimiet geldt). Bronnen: https://developers.cloudflare.com/workers/platform/limits/
- Een afzonderlijke D1-primary verwerkt queries na elkaar en kan bij drukte een volle wachtrij / overloaded-fout krijgen. Schalen vraagt minder query's, leesreplica's en/of accountverdeling, niet zomaar een groter theoretisch aantal geregistreerde gebruikers. Bron: https://developers.cloudflare.com/d1/platform/limits/
- R2 ondersteunt een onbeperkte hoeveelheid objecten/opslag per bucket op papier, maar dat zegt niets over de nog onbekende kosten, mediaverzoeken, bestandsformaten of gebruikerservaring. Bron: https://developers.cloudflare.com/r2/platform/limits/

## 6. Rapportstatus en veiligheidsgrens

| Controle | Status |
| --- | --- |
| Beide doelen expliciet vastgelegd | **Ja** (ook in TALERA Google Drive-doelregister) |
| Uitvoerbare Free-10M-wiskundige workloadtest | **Code toegevoegd; CI-uitkomst afzonderlijk controleren** |
| Uitvoerbare Premium-1M-gelijktijdige-sessiemodeltest | **Code toegevoegd; CI-uitkomst afzonderlijk controleren** |
| Drie anonieme HTTP-basisverzoeken | **CI-uitkomst afzonderlijk controleren** |
| Echte Free-10M-belastingtest | **NEE — nog niet bewezen** |
| Echte Premium-1M-concurrentietest | **NEE — nog niet bewezen** |
| Werkende autoscaling van opslag tot deze belasting | **NEE — nog niet bewezen** |

**Beschermd:** geen wijziging van PWA-code, productie-Workers, accounts, D1, R2, authentificatie, videospeler of privégegevens. Alleen een aparte conceptbranch met documentatie en testhulpmiddelen. Geen merge/deployment zonder akkoord.


## 7. Vastgestelde uitslagen van GitHub Actions, 8 november 2026

**Eigen gescheiden schaal-preflight:** https://github.com/Marksmits1972/talera-lifeline/actions/runs/42475922072 — **geslaagd**.

- **6/6 offline Node-tests geslaagd**: werkende formules voor Free 10 miljoen gebruikers en Premium 1 miljoen gelijktijdige sessies met zes foto's en audio; beide eindverdicts blijven **NIET BEWEZEN**.
- **3/3 werkelijk uitgevoerde, anonieme HTTP-GET's succesvol** tegen de bestaande, door de eigenaar geregistreerde TALERA-test-PWA, zonder login en zonder schrijftaken.
- /mijn-leven: HTTP 200, **585.945 HTML-bytes**, Cache-Control: no-store.
- /present: HTTP 200, **518.851 HTML-bytes**, Cache-Control: no-store.
- /tell: HTTP 200, **398.415 HTML-bytes**, Cache-Control: no-store.
- Voor deze HTML-responsen was geen bevestigende cf-cache-status zichtbaar. **Dit zegt niets definitiefs over de caching van overige JS/CSS/foto-assets.** Wel moet het ontbreken van HTML-caching serieus worden meegenomen in de Free-10M-capaciteitsmeting: zo'n HTML-request bereikt mogelijk telkens een Worker, ongeacht het bereik van Cloudflare's netwerk.
- Het getoonde Premium-getal van **28.000 hypothetische HTTP-operaties/s** is geen gemeten capaciteit. De extreem synchroon geopende voorbeeldpiek is **800.000 hypothetische operaties/s**.
- Er zijn **geen** tien miljoen echte codeverzoeken en **geen** miljoen echte gelijktijdige Cloudflare-clients aangemaakt.

**Bestaande algemene repo-regressieworkflow:** https://github.com/Marksmits1972/talera-lifeline/actions/runs/42475951522 — **rood**, maar om een andere reden: 91/93 tests geslaagd; twee tests vragen om xxory-test/src/tv-player.js en xxory-test/src/unified-webapp.js, die beide al op de ongewijzigde main branch ontbreken. De nieuwe schaaltestbranch heeft die bestanden niet verwijderd of aangeraakt. **Niet stiekem deze tests repareren als zijspoor**; eerst de status van de juiste repo-baseline vaststellen.

**Conclusie:** de minimale teststructuur is daadwerkelijk operationeel en maakt de twee doelen meetbaar, maar **de beide uiteindelijke schaalbaarheidseisen blijven onbewezen**. Voor een echte einduitspraak is de beschreven, goedgekeurde gedistribueerde staging-belastingproef noodzakelijk.
