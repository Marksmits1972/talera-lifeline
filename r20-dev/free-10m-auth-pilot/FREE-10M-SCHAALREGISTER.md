# TALERA Free – centraal schaalregister (8 november 2026)

**Doel: TALERA Free voor 10 miljoen gebruikers voorbereiden; Premium komt pas daarna.** De afzonderlijke onderdelen zijn gebouwd, maar tien miljoen gelijktijdige gebruikers zijn nog niet bewezen. De bestaande TALERA-app en accounts zijn ongemoeid gelaten.

| Poort | Status | Bewijs |
|---|---|---|
| F1. Wereldwijde distributie van gedeelde app-code | Gebouwd en lokaal getest | PR #93, GitHub run 42493578810 |
| F2. Apart en direct accountgebonden opslaan van geboortedatum | Gebouwd en lokaal getest met 64 fictieve accounts | PR #94, GitHub run 42503295621 |
| F3. Login, registratie, individuele sessies, directe intrekking zonder centrale D1 | Nieuw geïsoleerd pilot gebouwd en lokaal plus op echte EU Cloudflare getest | PR #95, GitHub run 42506218404 |
| F3b. Kleine echte belasting op Cloudflare | 120 succesvolle parallelle sessiecontroles, in trappen met maximaal 30 gelijktijdige verzoeken en gemeten p95 359–424 ms vanaf GitHub-runner | Run 42506218404 |
| F3c. Bestaande accounts veilig overzetten | Migratie-preflight met synthetische gegevens gebouwd; 9/9 tests geslaagd. Geen echte migratie uitgevoerd | Run 42506887577 |
| F4. Delen, likes en reacties | Per-herinnering SQLite Durable Objects en afzonderlijke intrekbare deelkoppelingen nu echt gebouwd, lokaal en in EU Cloudflare getest. **Nog niet geïntegreerd, oude links en berichten niet verhuisd.** | PR #96, run 42507774180 |
| F5a. Free-backend en originele twee persoonlijke tijdlijnpagina's, menu scripts, browser-gate | **Geïntegreerd en succesvol getest in échte lokale Cloudflare-runtime**, uitsluitend fictieve accounts | PR #97, run 42511659255 |
| F5b. Echte geïsoleerde EU-cloud: account/sessie, persoonlijke tijdlijn, oorspronkelijke PWA-bestanden, delen/intrekken | **Bewezen met twee fictieve accounts en één fictieve herinnering, 54 HTTP-verzoeken, géén originele backend-bindings** | PR #97, run 42513144276 |
| F5c. Complete lokale vertelcyclus met foto/video/audio en Safari op iPhone | **Nog NIET bewezen; legacy-uploadroutes worden expres niet doorgestuurd** | Functionele acceptatie vereist |
| F6. De volledige tienmiljoen-gebruikersbelasting, kosten en piekcapaciteit | **Niet bewezen** | Nog open |

## Alleen-lezen inventaris oorspronkelijke Cloudflare-databases

Momentopname: oorspronkelijke account-D1 heeft 6 accounts (6 actief), 23 sessierecords. Aparte geboortedatum-D1 heeft 0 geboortedatumrecords. De oorspronkelijke account-core bevat ook 15 memories, 16 shares, 4 grants, 10 comments, 4 likes, 25 messages en andere gerelateerde records. Alleen aantallen en kolomnamen zijn gelezen: geen klantidentiteiten of geheime tokens geëxporteerd; geen oude database aangepast. De gegevens kunnen na deze momentopname veranderen.

## Waarom Free nog niet definitief klaar is

De nieuwe authenticatieservice bezit eigen Durable Objects per account, sessie en inloglimiet. De losse EU-Cloudflare-staging werkte met twee nieuwe fictieve accounts en heeft geen verbinding met de originele TALERA D1, core of media. Dat betekent niet dat de originele Free-app al is omgezet. Sociale en deelroutes kunnen nog de gedeelde D1 belasten. Bestaande wachtwoordhashes, accounts, actieve sessies, rechten en koppelingen moeten veilig overgezet kunnen worden voordat enige omschakeling plaatsvindt. Een bestaande sessie kan technisch worden geïdentificeerd via haar opgeslagen SHA-256-hash zonder rauwe cookie uit te lezen; een veilige echte migratie is nog niet uitgevoerd. De stagingtestsleutels wisselen bewust per CI-run, waardoor uitsluitend fictieve stagingaccounts opnieuw aangemaakt moeten worden; dit mag absoluut niet in een productiesysteem gebeuren.

## Enige volgende werkroute

1. Breng de werkelijk gebruikte Free-sociale en deelroutes onder een schaalbaar, afgeschermd opslagpad met de juiste revocatie, identiteit en oude storylinks; maak aparte tests, geen wijzigingen aan bestaande data.
2. Combineer de nieuwe statische app-code, account-DO, login-DO en schaalbare sociale route in één onafhankelijke Free-PWA-staging. Doe vervolgens alle mobiele regressietests zonder aan de vertelcyclus, foto's, video of tijdlijnen te veranderen.
3. Bereid de echte account- en gegevensoverstap met controle van alle records, privacy en rollback voor. Oude opslag blijft onaangetast totdat expliciete toestemming en verificatie aanwezig zijn.
4. Meet stapsgewijs echte piekbelasting en kosten op uitsluitend staging, met vooraf afgesproken grenzen. Het aantal van 10 miljoen is een te bewijzen capaciteit, geen conclusie uit een kleine test.
5. Pas bij volledig bewezen Free-capaciteit gaan we naar Premium.

Bewijs: https://github.com/Marksmits1972/talera-lifeline/pull/93 , https://github.com/Marksmits1972/talera-lifeline/pull/94 , https://github.com/Marksmits1972/talera-lifeline/pull/95 ; echte EU-cloudtest https://github.com/Marksmits1972/talera-lifeline/actions/runs/42506218404 ; migratiepreflight https://github.com/Marksmits1972/talera-lifeline/actions/runs/42506887577 .

## F4-update: nieuwe sociale route

Sociale DO-staging op echte EU Cloudflare geslaagd: 48 kleine, synthetische HTTP-verzoeken, delen en revocatie en 36 parallelle reads zonder fouten. Eén 12-requestsband had circa 2,7 seconde p95, zodat dit **geen snelheidsgarantie** is. Het hotstory-risico, berichten/discovery, migratie van oude rechten en integratie in de gehele app staan nog open. PR #96: https://github.com/Marksmits1972/talera-lifeline/pull/96 . Bestaande D1 en verhalen niet gewijzigd.

## F5a-update — geïntegreerde Free-stage

PR #97 bouwt één nieuwe, strikt gescheiden F5-Worker waarin de F1 publieke appcode, F3 sessie/account-DO en F4 sociale storage-DO achter één origin werken. De persoonlijke `/mijn-leven` en `/present` tijdlijnen worden vanuit het individuele account en dezelfde bestaande personalisatielogica opgesteld. Het oorspronkelijke menu-JS en drie andere publieke scripts zijn identiek geverifieerd; een korte private QA-cookie maakt browsernavigatie mogelijk zonder blootstellen van testgeheimen in de frontend. GitHub Actions **42511659255 is geslaagd** na lokale Cloudflare-integratietests met fictieve gegevens. De productielink en klantdata zijn onaangetast. Alleen een lokale CI-run, dus geen F5 EU-cloudtest of Safari-acceptatie en geen bewijs voor 10 miljoen gebruikers. Free blijft onvoltooid totdat de complete verhaalcyclus in F5b, veilige migratie en gerichte schaalpoort zijn geaccepteerd.

## F5b-update — bewijs op echte EU Cloudflare en expliciete restgrens

Op de aparte nieuwe Worker `talera-free-f5-combined-stage-20261108` staan alleen zeven nieuwe DO-namespaces, de goedgekeurde publieke static assets en vijf tijdelijke geheime QA-binds; géén `TALERA_BASE`, D1 of R2. De bestaande officiële PWA en klantaccounts zijn onaangetast. De echte GitHub Actions EU-run [42513144276](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42513144276) is **geslaagd**: 2 fictieve accounts, 1 fictief social story-object, persoonlijke geboortedatum in beide tijdlijnschermen, oorspronkelijke menu-JavaScript/serviceworker/manifest, login/logout, rechten, deeltoken-intrekking en 54 kleine HTTP-verzoeken. Bij 10 GETs per band was p95 ca. 490 ms (1 gelijktijdig), 685 ms (5) en 538 ms (10), vanaf GitHub-runner. Dit is geen p95 voor miljoenen gebruikers.

**Vaste laatste Free-functiepoort:** de originele recorder/presentatie in Safari/iPhone daadwerkelijk van begin tot eind beproeven met lokale foto's, video, audio en cue-tijdstempels en de lokale IndexedDB-herinnering teruglezen. De goedgekeurde oude bron bevat al `TaleraMemories` in IndexedDB, maar daarnaast nog optionele/historische `/api/v9/audio`, `/api/v9/photo`, `/api/v9/memory` en andere media-/publicatieroutes. De nieuwe F5-worker weigert onbekende routes met 404 in plaats van ze ongemerkt naar de oude productiebackend door te sturen. **Geen complete vertelcyclus certificeren zolang de daadwerkelijke browserstroom niet is bewezen.**

**F6 — vaste eindbeoordeling:** Cloudflare bevestigt dat statische Workers Assets gratis/onbeperkt als static assets worden geleverd, maar verzoeken die de Worker uitvoeren en Durable Object reads/writes zijn géén gratis onbeperkte capaciteit; zie https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ en https://developers.cloudflare.com/workers/platform/pricing/ . Omdat F5 bezoekers bij QA door een Worker gaan, en ingelogde accounts dynamische DO's gebruiken, zijn 54 smoke-verzoeken géén bewijs voor 10 miljoen Free-gebruikers. De uiteindelijke status kan pas GROEN zijn na de ene mobiele acceptatie en de afgesproken begrensde capaciteits-/kostentoets. Geen extra zijtrajecten.

## F5c-update — eindtest Free zonder Premium (8 november 2026)

**Bewezen groene integratie:** [GitHub EU-cloudbrowser-run 42516137777](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42516137777). De ene aparte Free-F5-origin werkt met accountgebonden sessies, privé geboortedatum in beide tijdlijnen, zeven onafhankelijke DO-klassen en sociale grant/revoke/share. Via een **echte Chromium-browser met iPhone-scherminstellingen** zijn een kleine fictieve foto, video en audio in de originele lokale IndexedDB-store opgeslagen, na herladen en op de presentatie teruggelezen met dezelfde narratiecues en tijdstempels. Een tweede account op hetzelfde virtuele toestel kon het verhaal niet lezen; account A kon het na terugwisselen opnieuw lezen. **Geen originele D1/R2-klantbindingen**. De Free-media blijven lokaal; de oude cloud-upload-API's worden niet aan de Free-route gekoppeld.

De eerste Linux-WebKit-proef kon al zonder TALERA-code geen willekeurige Blob/File in een lege IndexedDB schrijven ([bewijs 42515888619](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42515888619)). De oorspronkelijke TALERA-vertel- en presentatielogica is daarom **niet** herschreven om dit CI-platformprobleem te omzeilen. Echte iPhone-Safari-microfoon, camera, swipe en speler blijven de **enige nog niet zelf uitgevoerde fysieke acceptatie**.

**F6 beperkte schaal/kosten** is afgerond in `r20-dev/free-10m-f5/F6-BEOORDELING-10M-FREE.md`: technische architectuur voor 10 miljoen **geregistreerde** Free-gebruikers, niet 10 miljoen gelijktijdige uploads/requests; Cloudflare Paid heeft onbeperkt veel losse DO-objecten, statische assets kunnen gedeeld worden, per-story hotspots en CPU-/DO-kosten moeten bij gefaseerde uitrol worden bewaakt. Deze beperkte test is geen letterlijk 10M-simulatieresultaat.

**Harde stopregel:** geen nieuwe algemene onderzoekrondes. Vóór omschakeling precies één echte iPhone Free-story van opname/foto/video/swipe tot heropenen en presentatie accepteren, en een veilige migratie/rollback plus productiebeveiliging expliciet goedkeuren. Huidige officiële TALERA-link, originele accounts en Premium ongewijzigd.
