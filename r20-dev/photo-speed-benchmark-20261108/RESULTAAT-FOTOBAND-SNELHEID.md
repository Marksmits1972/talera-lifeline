# TALERA — fotoband laadsnelheid: D1 versus Durable Objects versus één manifest + R2

**8 november 2026 — afgerond, alleen geïsoleerde Cloudflare-testbronnen.** Niets gewijzigd aan bestaande TALERA-app, opname-/presentatiescherm, accountdata, D1's, R2, media of tijdlijn.

## Besluit in één zin

**Vervang de werkende TALERA-databases NIET uitsluitend voor snellere foto's.** In drie echte testuitvoeringen werd de laadtijd vooral bepaald door het aantal backend-opzoekingen en R2-downloads. Wanneer de fotolijst eenmaal wordt gelezen en de foto's rechtstreeks uit R2 worden opgehaald, zijn D1 en een SQLite Durable Object qua end-to-end-tijd zeer vergelijkbaar.

## Opstelling (echt gemeten, maar niet in de TALERA PWA)

- Afzonderlijke Worker: `talera-photo-strip-speed-test-20261108`.
- Eigen Europese D1: `talera-photo-speed-d1-test-20261108`; eigen EU Durable Object-namespace in dezelfde Worker; eigen EU R2: `talera-photo-speed-r2-test-20261108`.
- **12 geldige PNG-afbeeldingen per fotoband**, 320 × 180, gemiddeld **173.098 bytes** (~2,08 MB per volledige fotoband), volledig fictieve beeldinhoud.
- Dezelfde 8 fictieve account-ID's, dezelfde media-objecten en dezelfde fotovolgorde voor beide SQL-backends. De Worker meet afzonderlijk tijd voor SQL en R2, en de GitHub-testclient de volledige HTTPS-overdracht.
- Alle HTTP-responses `no-store`; geen CDN / browsercache; laden van alle twaalf beelden parallel nadat één fotolijst is gelezen.
- Een databaseverzoek bij **elke foto** is afgezet tegen **één fotolijstverzoek + twaalf directe R2-mediaverzoeken**. D1 en DO gebruiken exact dezelfde R2-foto's.
- In de eerste proef zes herhalingen per variant; daarna twee extra onafhankelijke uitvoeringen met tien herhalingen per variant. Elk produceerde een groen GitHub Actions-resultaat.

## Uitkomsten: p50 van tijd voor de volledige fotoband (ms)

| GitHub-uitvoering | D1, SQL bij elke foto | DO, SQL bij elke foto | 1× D1-manifest, dan R2 | 1× DO-manifest, dan R2 |
|---|---:|---:|---:|---:|
| [#42469762029](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42469762029) (6 rondes) | 627 | 729 | niet afzonderlijk gemeten | 450 (éénmalig DO-manifest) |
| [#42469991126](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42469991126) (10 rondes) | 604 | 631 | **468** | **479** |
| [#42470003841](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42470003841) (10 rondes) | 837 | 746 | **575** | **556** |

De data schommelen tussen uitvoeringen (GitHub-runner, netwerk- en Cloudflarebelastingen zijn niet vastgepind). De volgorde D1 versus DO wisselt. **Er is geen bewezen structureel snelheidsverschil tussen D1 en DO** wanneer beide dezelfde korte route gebruiken. De optimalisatie 'één manifest en daarna media ophalen' levert in deze test wél een zichtbaar voordeel op ten opzichte van een aparte SQL-opzoeking per foto.

### Wat betekenen deze cijfers NIET?

- Niet: 0,5 seconde gegarandeerde iPhone-laadtijd. Er is **geen iPhone, browser-rendering, afbeelding-decode, scrollen, Wifi/4G/5G of opbouw van het bestaande TALERA scherm** gemeten.
- Niet: het bewijs dat TALERA vandaag daadwerkelijk **één D1-query per foto** doet. De benchmark vergelijkt twee mogelijke backend-ontwerpen; de actuele code moet apart read-only worden geprofileerd vóór een frontend- of API-wijziging.
- Niet: de echte snelheid van full-resolution foto's of video's; de fictieve PNG's zijn klein (320×180). Werkelijke fotoband kan andere afmetingen/compressie gebruiken.
- Niet: één miljoen gelijktijdige gebruikers, cachehitprestaties of werkelijke privacycontrole. Deze beperkte proef meet server-/netwerksnelheid en gebruikt één gedeeld testsecret.
- Niet: 100% bewezen superioriteit van DO of D1 voor andere workloads. Durable Objects blijven relevant voor **account-lokale schaalbaarheid**, maar dat is een *ander* architectuurbesluit dan laadsnelheid van foto's.

## Privacy: het snelste pad moet nog steeds veilig blijven

De speciale `mode=r2`-test vraagt na het manifest niet meer voor elke afbeelding een SQL-record op, maar is uitsluitend beveiligd door de *algemene* fictieve testtoken. De beelden zijn opzettelijk gedeelde dummy-PNG's. **Deze URL/vorm is niet veilig om ongewijzigd voor privéfoto's te gebruiken.** Een latere productievariant moet de bestaande TALERA-gebruikerssessie, accountrechten, grant/share-expiry en intrekking handhaven, bijvoorbeeld door (a) een gecontroleerde mediatoegang met een kleine backendvalidatie, of (b) korte ondertekende/gebonden mediatoegang na een geautoriseerd manifest. Voor gevoelige bestanden geen publieke R2-bucket/caches zonder gedegen privacyontwerp, en geen langdurige links na intrekking.

## Technisch advies voor de echte TALERA-fotoband (alleen na aparte proef)

1. **Respecteer de bestaande recorder en één zichtbare presentatieplayer**; geen nieuwe fotospelers, geen wijziging van swipe-cue-ID's, tijdstempels, video-/audioafhandeling of aangewezen PWA-link.
2. **Lees de compacte fotolijst en sortering hooguit één keer per openings-/verversactie**; daarin staan de stabiele foto-ID, volgorde en versie/ETag, geen zware mediabytes. Dit ontwerp alleen uitvoeren als de huidige code niet al gelijkwaardig optimaliseert.
3. **Fotoband gebruikt geoptimaliseerde thumbnails** voor de rij; originele hoge resolutie blijft voor daadwerkelijk geopende foto of presentatie. Geen herhaalde thumbnailgeneratie uit videobestanden op iedere vraag.
4. **Laad de eerst zichtbare foto's als eerste**, en prefetch daarna een begrensd aantal komende foto's met correcte abort/retry bij scroll- en navigatiewisselingen. Vermijd ongelimiteerd tegelijk opvragen of openen van alle grote video's.
5. **Meet time-to-first-thumbnail, tijd tot alle zichtbare thumbnails, scroll-jank en klik-naar-foto op een echte iPhone** bij koud/warm cache, Wifi en mobiel internet. Hou de totale media-overdracht, request-aantal en server-/R2-timing apart.
6. **Respecteer privacy en opslagveiligheid** bij cache en downloads. Geen generieke publieke CDN-cache voor privésessies, geen onbeveiligde objectkeys of rechtenloze R2-links. Playback van grote media moet streaming/Range/ETag en de bestaande audio/video-cues blijven ondersteunen.
7. **Pas pas iets aan als een afwijking is bewezen.** Een staging-kopie van alleen de fotoband vergelijken met de huidige versie; de correcte originele link mag nooit automatisch worden overschreven.

## Aanbevolen vervolgstap

**Lees alleen de huidige fotoband-codes en traceer het echte netwerkpad** in de officiële TALERA-variant. Is er al één manifest, dan eerst kijken naar thumbnails, lazy loading, preloading en caching zonder SQL-enginewissel. Als de echte PWA wél een DB-query per foto doet, kan een kleine adapter dat reduceren. Eerst een onafhankelijke testorigin + iPhone-acceptatie, **geen productiecodemutaties totdat de gebruiker dit uitdrukkelijk goedkeurt**.

## Bronverwijzingen

- Cloudflare R2 en cache: https://developers.cloudflare.com/r2/buckets/public-buckets/ ; https://developers.cloudflare.com/workers/cache/
- Cloudflare D1 versus Durable Objects: https://developers.cloudflare.com/workers/platform/storage-options/#sql-in-durable-objects-vs-d1
- Volledige echte proeflogs: [eerste zes rondes](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42469762029), [tien rondes A](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42469991126), [tien rondes B](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42470003841).

**Afsluiting:** doel 'snel en betrouwbaar laden van de fotoband' vergt primair een korter **media-verzoekpad**, niet automatisch een nieuwe SQL-engine. Alle tests draaiden op synthetische gegevens en de officiële TALERA PWA bleef ongemoeid.