# TALERA — fictieve capaciteitstest met één miljoen gebruikers

**Datum:** 8 november 2026  
**Status:** GitHub Actions succesvol; uitsluitend rekenmodel + lokale, synthetische code-uitvoering. **Dit is GEEN productie-loadtest en bewijst GEEN capaciteit voor één miljoen gelijktijdige gebruikers.**

## Samenvatting

- **1.000.000 unieke fictieve gebruikers-ID's** doorlopen in een offline rekenlus. Geen echte registratie, geen passwords, geen live accountwrites.
- Drie echte **publieke, uitgelogde** HTML-pagina's één keer opgehaald van de bestaande diepblauwe testbasis: `/mijn-leven` (581.385 bytes), `/present` (514.291 bytes), `/tell` (398.421 bytes).
- De **bestaande onderhouds-Workerbron** werd lokaal via Node 22 en namaak-servicebindings op elk scherm **18 keer uitgelogd + 18 keer met een fictieve ingelogde sessie** doorlopen: 108 geslaagde lokale verzoeken. Geen productieconcurrentie.
- Bij de twee tijdlijnen was de DOB-aanpassing in de fictief ingelogde stand geactiveerd; vijftaleninjectie op alle drie de pagina's.
- **Geen fundamentele blokkade bewezen in de afzonderlijk doorgelopen HTML-rewrites.** Eén gedeelde D1-primary is onder zware *aangenomen* piekdruk wél een **te onderzoeken schaalrisico**.
- Geen werkende Worker, echte database, teller, mediastream, account, Cloudflare-binding of PWA gewijzigd.

## 1. Lokale herhalingen van de bestaande Worker

De tijden hieronder zijn **wall-clock metingen van Node 22 op één GitHub-runner**, inclusief in-memory HTML-Response-opbouw/tekstverwerking; het is géén Cloudflare CPU-meting en géén garantie voor gelijktijdige verzoeken.

| Pagina | Fictieve sessie | Mediaan | p95 | Uitvoer-HTML |
|---|---|---:|---:|---:|
| Mijn leven | Uitgelogd | 7,30 ms | 9,75 ms | 585.637 B |
| Mijn leven | Ingelogd | 7,30 ms | 8,62 ms | 585.606 B |
| Presentatie | Uitgelogd | 7,84 ms | 10,91 ms | 522.937 B |
| Presentatie | Ingelogd | 8,25 ms | 12,36 ms | 522.937 B |
| Vertellen | Uitgelogd | 4,61 ms | 7,79 ms | 402.673 B |
| Vertellen | Ingelogd | 4,64 ms | 6,06 ms | 402.673 B |

**Interpretatie:** de lokale transformaties eindigen netjes en produceren de verwachte pagina's. De gegenereerde HTML is relatief omvangrijk (ongecomprimeerd circa 0,4–0,59 MB), maar dat bewijst niet dat de code op Cloudflare traag is. Werkelijk verbruik, cache en netwerkcompressie moeten afzonderlijk worden gemeten.

## 2. Exacte scenario-aannames — geen geobserveerd TALERA-verkeer

- **1.000.000 geregistreerde gebruikers**, met 1%, 10%, 50% of 100% daarvan op een dag actief.
- Elke actieve persoon: **10 HTML-weergaven, 8 mediaweergaven, 15 D1-leesopdrachten en 1 D1-schrijfactie per dag**. Dit zijn fictieve schattingen, geen uit de echte code of logs gemeten aantallen.
- Spitsuurpiek wordt gerekend als **12× het 24-uursgemiddelde**. Geen feitelijke verkeersverdeling gemeten.
- Één gedeelde D1-primary als *worst-case scenario*; theoretische totale capaciteit van 1.000, 200 of 50 opdrachten per seconde wanneer één databasequery respectievelijk 1, 5 of 20 ms duurt; nog zonder per-request overhead, netwerk of overhead.

## 3. Modelresultaten bij een veronderstelde D1-queryduur van 5 ms

| Dagelijks actieve gebruikers | Geschatte piek HTML GET/s | Geschatte piek D1 queries/s (lees+schrijf) | Deel van theoretische 200 query/s primary |
|---:|---:|---:|---:|
| 10.000 (1%) | 13,9 | 22,2 | 11% |
| 100.000 (10%) | 138,9 | 222,2 | 111% — hypothetische overbelasting |
| 500.000 (50%) | 694,4 | 1.111,1 | 556% — hypothetische overbelasting |
| 1.000.000 (100%) | 1.388,9 | 2.222,2 | 1.111% — hypothetische overbelasting |

**Cruciale nuance:** deze overbelasting wordt alleen voorspeld **als** zulke aantallen queries inderdaad op dezelfde afzonderlijke D1-primary terechtkomen, **als** de gemodelleerde duur per query klopt en **als** alle fictieve parameters overeenkomen met het gebruik. Dat is **niet aangetoond**. Bij 1-ms-queries blijft 100.000 DAU in dit model op 22% van de theoretische capaciteit. Bij 20-ms-queries kunnen problemen eerder ontstaan. De test geeft een **onderzoekspunt**, geen bugrapport.

Cloudflare D1 verwerkt één query tegelijk per database; de maximale doorvoer hangt af van de queryduur en is theoretisch ongeveer 1.000 / duur in ms. Leesreplica's en spreiding over databases kunnen reads ontlasten, maar leesreplica's verwerken geen writes op hun eigen primary. Zie officiële documentatie:

- https://developers.cloudflare.com/d1/reference/faq/
- https://developers.cloudflare.com/d1/best-practices/read-replication/

## 4. Video's, foto's en opslag

Voorbeeld, **géén bestaande TALERA-data**: één miljoen personen met elk 20 verhalen, vijf foto's van 3 MB per verhaal en gemiddeld vijf video's van 80 MB per persoon betekent ca. **700 TB originele media** totaal. Dit zegt vooral iets over **R2-opslag, media-requests, kosten en caches**, niet over de hoeveelheid JavaScript-code of het aantal Workerlagen.

Cloudflare R2 ondersteunt een onbeperkt aantal objecten en onbeperkte opslag per bucket volgens de actuele platformdocumentatie. Echte upload- en afspeelpieken, videokwaliteit en kosten zijn nog niet getest. Zie https://developers.cloudflare.com/r2/platform/limits/ .

## 5. Wat de test niet bewijst

- Geen miljoen HTTP-verzoeken, geen miljoen echte sessies, geen echte concurrentie of piek op Cloudflare.
- Geen echte D1-read-/write-latenties, queryplannen, opslagomvang, indexering of gedeelde databaseverdeling gemeten.
- Geen R2-media-upload, streaming, video-autoplay, bandwidth, CDN of browsercache op schaal gemeten.
- Geen echte accountregistraties, persoonsgegevens of media gebruikt; geen databases veranderd.
- Geen Workers samengevoegd of wijzigingen aan de op iPhone goedgekeurde vertelcyclus.
- Dit scenario kan daarom niet vaststellen of de huidige TALERA-architectuur één miljoen realistische gebruikers daadwerkelijk aankan.

## Advies (zonder codewijzigingen)

1. **Stoppen met cosmetisch opruimen.** De simulator toont geen reden om de werkende vertelcyclus of 13 Workerlagen preventief te herprogrammeren.
2. **Vóór groei naar grote aantallen:** de huidige databasestructuur en daadwerkelijke query-aantallen, queryduur, indexen en piekverdeling read-only meten; nagaan of verschillende gebruikers een gedeelde primary belasten. D1 `wrangler d1 insights`/Analytics zijn daarvoor geschikt; alleen via bevoegd read-only toegang.
3. **Daarna pas een gecontroleerde, geïsoleerde lichte performanceproef** op een volledig aparte testbackend met fictieve mediagegevens en afgeschermde database. Geen agressieve loadtest tegen de huidige app of gedeelde accountsystemen.
4. **Pas bij een gemeten bottleneck** gerichte maatregelen ontwerpen: indexen en minder onnodige databasevragen, caches, D1 read replicas met Sessions API of veilig verdelen van gegevens, plus R2-mediaaflevering. Niet blind samenvoegen.

## Uitvoering / bewijs

GitHub: `.github/workflows/talera-one-million-synthetic.yml` en `r20-dev/capacity-audit-20261108/simulate-one-million.mjs` op branch `feature/synthetic-capacity-1m-audit-20261108`. De Actions-run bevat de volledige JSON-uitvoer als tijdelijk rapportartifact. Er is **geen deployment** en **geen live-benchmark** uitgevoerd.