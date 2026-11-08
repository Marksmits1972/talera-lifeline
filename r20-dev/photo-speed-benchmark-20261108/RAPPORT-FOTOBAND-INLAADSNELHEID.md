# TALERA — echte fotoband-inlaadsnelheid: D1 versus SQLite Durable Objects en R2

**8 november 2026 — afgeronde, volledig geïsoleerde Cloudflare-praktijktest.** Niets aangepast aan de bestaande TALERA-PWA, accounts, privéverhalen, originele media of de ene bestaande presentatieplayer.

## Beantwoord de vraag: wordt de fotoband sneller als we D1 vervangen?

**Nee, niet aantoonbaar door de keuze voor Durable Objects alleen.** De grootste en herhaalbare verbetering bij het laden van de fotoband is **één keer de fotolijst ophalen en vervolgens de bijbehorende afbeeldingsbytes rechtstreeks uit R2 laten komen**, zonder een nieuwe SQL-databasequery per foto. Of het ene manifest uit D1 of uit een SQLite Durable Object komt, gaf in deze eerste twee echte herhalingen geen duidelijk, consistent voordeel.

## Werkelijk uitgevoerde vergelijking

Identieke Worker (`talera-photo-strip-speed-test-20261108`), identieke gemeten HTTP-codepaden en SQL-manifests, alleen het metadata-backend verschilt tussen D1 en een per-account SQLite Durable Object. Beide EU-opslagvarianten gebruiken exact dezelfde **12 echte, geldige PNG-bestanden, 320×180 pixels, gemiddeld 173.098 bytes** in een unieke uitsluitend voor dit onderzoek gemaakte EU R2-bucket. Twee EU-databasesystemen zijn daadwerkelijk aangemaakt/gebruikt; 8 fictieve accounts met elk 12 records zijn in beide backendvarianten klaargezet. Iedere afbeelding is in de meting volledig per HTTPS overgedragen.

### Laadtijd volledige fotoband (ms, p50 uit elke serie)

| Testpad | Eerste volledige run (6 herhalingen) | Herhaling A (10) | Herhaling B (10) |
|---|---:|---:|---:|
| D1: fotolijst, daarna **databasecheck per foto** + R2 | 626,90 | 603,78 | 837,34 |
| Durable Object: fotolijst, daarna **databasecheck per foto** + R2 | 728,99 | 630,85 | 745,64 |
| D1: **één fotolijst** + daarna **R2 zonder nieuwe SQL per foto** | niet apart uitgevoerd | **467,69** | **574,55** |
| Durable Object: **één fotolijst** + daarna **R2 zonder nieuwe SQL per foto** | 449,65 | **479,21** | **556,16** |

**Interpretatie:** zodra beide ontwerpen het manifest één keer ophalen en daarna direct R2-data leveren, schelen hun middelste tijden slechts **11,52 ms** in herhaling A (D1 sneller) en **18,39 ms** in herhaling B (Durable Object sneller). Deze volgorde wisselt dus. Dit is geen stabiel aangetoonde architectuursnelheidswinst.

De winst door het weglaten van de databasecheck **voor iedere foto** was veel groter: in herhaling A daalde de D1-band van 604 naar 468 ms en de DO-band van 631 naar 479 ms; in herhaling B D1 van 837 naar 575 ms en DO van 746 naar 556 ms.

### Cataloguslijst alleen (24 requests per backend per run)

| | Eerste volledige run p50 | Herhaling A p50 | Herhaling B p50 |
|---|---:|---:|---:|
| D1 fotolijst (12 thumbnails) | 157,70 ms | 165,96 ms | 197,97 ms |
| DO fotolijst (12 thumbnails) | 153,08 ms | 168,82 ms | 189,09 ms |

Ook de fotolijstquery zelf is qua waargenomen tijd **vergelijkbaar**. Bij grotere belasting of andere regio's kan dat anders zijn; deze proeven voorspellen geen capaciteit bij honderdduizenden gelijktijdige gebruikers.

### Afzonderlijke fotoverzoeken — herhaling A (120 HTTP-requests per variant)

| Route | p50 complete PNG-overdracht | p95 complete PNG-overdracht |
|---|---:|---:|
| D1-query vóór iedere foto + R2 | 341,27 ms | 737,77 ms |
| DO-query vóór iedere foto + R2 | 348,97 ms | 517,19 ms |
| R2 zonder fotogebonden SQL-query (D1-manifest al binnen) | **190,37 ms** | 303,36 ms |
| R2 zonder fotogebonden SQL-query (DO-manifest al binnen) | **194,66 ms** | 318,35 ms |

Dit onderbouwt waarom we de hele fotoband en de afzonderlijke verzoeken moeten onderscheiden: **de databaseopzoeking wordt vermeden** als het manifest de foto-IDs, volgorde en toegestane mediaverwijzingen al heeft geleverd. De echte app moet nog steeds correct authenticeren en privémedia beschermen.

## De kortste veilige route, onafhankelijk van databasekeuze

```text
TALERA -> (bestaande accountcontrole) -> 1x fotomanifest uit D1 OF account-DO
                                      |
                                      +-> kleine, passende fotovoorbeelden uit R2
                                          op basis van al bekende media-ID's
                                          (géén extra SQL-query per afbeelding)
```

Voor daadwerkelijk privé materiaal mag 'direct uit R2' NIET betekenen dat de bucket of permanent herbruikbare URL publiek wordt. De authentieke TALERA-gebruiker en verhaalrechten moeten worden gecontroleerd, bijvoorbeeld bij een kortlevende, strikt gescopeerde media-toestemming of een veilige Worker-mediaroute. Bij intrekking van gedeelde toegang mogen privémedia niet blijven doorsijpelen via een algemene publieke cache. Het demo-bearertoken in deze test is niet geschikt als productieauthenticatie.

## Wat deze test NIET bewijst

- Testcomputer: één GitHub Actions Linux-runner, via `workers.dev` naar EU Cloudflare-opslag. **Geen iPhone**, browser-weergave of mobiele wifi/4G gemeten.
- Geldige maar **synthetische PNG's** van 320×180 en 173 KB per foto. Echte TALERA-foto's, thumbnails, previews en video-posters kunnen sterk verschillen in bestandstype, resolutie, grootte en decodeertijd.
- HTML/CSS-compositie, fotoband-swipe, scroll, beelddecodering, memory pressure, Safari's video thumbnail/poster, prefetch of realistische preloadstrategie niet gemeten.
- Geen caching (`Cache-Control: private,no-store`), geen echte CDN/custom domain, geen warme browsercache. Cache-winst voor geautoriseerde private media is nog afzonderlijk uit te werken.
- Geen miljoenen tegelijk actieve gebruikers; we hebben 8 fictieve accounts, 24 catalogusqueries per backend en hooguit 10 fotobandproeven per variant per uitvoering gebruikt.
- Met `mode=d1`/`mode=do` werd **bewust** een databasequery per foto gesimuleerd om de kosten ervan zichtbaar te maken. **Niet aangetoond dat de huidige TALERA-fotoband die inefficiënte route nu werkelijk gebruikt.**
- De huidige TALERA-presentatiecode in `r20-dev/one-flow/one-flow.worker.mjs` verwerkt onder andere video-covers met `URL.createObjectURL(blob)` en houdt de eigen presentatieplayer aan. Lokale/ingeladen mediavoorbeelden kunnen dus andere laadtijden geven dan de afzonderlijke R2-netwerkproef.

## Conclusie voor TALERA

**Niet omwille van fotoband-inlaadsnelheid de bestaande D1-laag vervangen.** Dat zou een grote gegevensmigratie en regressierisico betekenen, zonder een bewezen snelheidsvoordeel bij het tonen van twaalf foto's. De per-account SQLite Durable Object-proef uit PR #89 is nog steeds interessant als **langetermijnopslagontwerp** voor veel gebruikers, maar dat is een afzonderlijke schaalbaarheids- en beveiligingsbeslissing; dit meetrapport beslist die keuze niet.

**Veilige volgende stap voor de werkelijke fotoband:** inspecteer uitsluitend de bestaande foto-/video-belading in de goedgekeurde PWA, meet hoeveel metadata-opzoekingen en echte beeldbytes er per opening zijn, en vergelijk op dezelfde iPhone: eerste keer openen, opnieuw openen en swipen. Dan gericht bepalen of compacte thumbnails, hergebruik van lokale object-URL's, vooraf laden van de volgende beelden of een veilige privémediacache winst geven. De bestaande vertelcyclus, de media-ID's, audio-cues, tijdstempels en **één zichtbare presentatieplayer** blijven onaangeraakt.

## Bewijs in GitHub

- Eerste volledig geslaagde echte proef (6 fotobanden/variant): https://github.com/Marksmits1972/talera-lifeline/actions/runs/42469762029
- Gelijke geoptimaliseerde D1- en DO-routes, 10 fotobanden/variant: https://github.com/Marksmits1972/talera-lifeline/actions/runs/42469991126
- Onafhankelijke extra herhaling met omgekeerde rangorde: https://github.com/Marksmits1972/talera-lifeline/actions/runs/42470003841
- Technische bestanden: `worker.mjs`, `provision.mjs`, `measure.mjs` onder `r20-dev/photo-speed-benchmark-20261108/`.

Cloudflare-documentatie: https://developers.cloudflare.com/workers/platform/storage-options/ (D1 vs DO), https://developers.cloudflare.com/r2/buckets/public-buckets/ (R2/CDN, let op private toegang) en https://developers.cloudflare.com/workers/cache/ (Worker-respons-caching).

**Privacy/release:** alleen nieuwe geïsoleerde EU-D1 en EU-R2-resources plus een eigen benchmark-Durable Object; geen productie-Wrangler, bestaande PWA, accounts, echte herinneringen, video-/audiobestanden of officiële TALERA-link gewijzigd.