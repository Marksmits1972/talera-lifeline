# TALERA V9 — werkelijk definitief verwijderen

**Afzonderlijke testlink:** https://talera-v61-r20-definitief-verwijderen-v9-20261104.mark-a39.workers.dev/

**Worker:** `talera-v61-r20-definitief-verwijderen-v9-20261104`  
**Cloudflare versie:** `683c6aaf-8dd0-42de-b6e4-f3bd80d7de06`  
**Basis:** ongewijzigde V8 via `V8_BASE`

## Gebruikersprobleem
V6 verwijderde uitsluitend `TaleraMemories.remove(id)` van de gepubliceerde herinnering in het `stories`-objectstore. Een aparte, tijdens `/tell?edit=<id>` gemaakte kopie bleef in de `talera-v4-work:manifest` achter als groep met `existing=<id>` en zes mediafiles. Daardoor stond de herinnering na verwijderen nog onder 'Jouw herinneringen', en opnieuw plaatsen probeerde een inmiddels ontbrekende publicatie-ID te bewerken.

## V9 herstel

- Beide definitieve verwijderknoppen (bestaande editor, én de kaart op Mijn leven) gebruiken nu dezelfde `window.__taleraV9FullDelete(id)`.
- Eén readwrite IndexedDB-transactie op `talera-lifeline-dev-local-v1` met objectstores `stories` en `files`:
  - controleert `source='pwa-local'` en het exacte ID;
  - verwijdert het gepubliceerde `stories`-record;
  - verwijdert uitsluitend de eraan gekoppelde groepen uit `talera-v4-work:manifest` (`g.existing===id`), met respect voor onafhankelijke concepten;
  - ruimt uitsluitend ongebruikte conceptbestanden en miniaturen op;
  - verwijdert de unieke gepubliceerde mediabestanden en telefoonweergaven, **niet** de door andere herinneringen gedeelde media;
  - verwijdert de bijbehorende sleutel van de foto-duplicaatindex.
- Gerelateerde handoff-referenties in specifiek bekende `localStorage`-sleutels worden verwijderd als ze exact naar hetzelfde ID wijzen.
- Het opstarten van de bestaande editor verwijdert voortaan eveneens verweesde bewerkconcepten met `existing=local-...` waar geen gepubliceerde herinnering meer bij bestaat. Dat repareert ook oudere halve verwijderingen **binnen dezelfde browserorigin**.
- Bij afwijkende oorspronkelijke HTML-ankers wordt de oude gedeeltelijke verwijderknop uitgeschakeld in plaats van riskant toch door te gaan.
- Geen nieuw bewerkscherm, geen gewijzigde foto-/vertelcyclus, geen gewijzigde swipe of vormgeving.
- Geen andere versies aangepast.

## Browseropslag en back-up

De in deze V61-R20-keten gecontroleerde opslag en de concepten zitten in **dezelfde lokale IndexedDB-database**. De bron van de `talera-pwa-v61-opslag-onder-instellingen-20261101`-Worker meldt dat een automatische back-up in deze keten **niet geactiveerd** is ('back-up volgt'). Definitief verwijderen maakt dus de bestaande lokale bibliotheek en editorconcepten schoon; een nieuw toekomstig back-upexport uit die bibliotheek bevat de verwijderde herinnering niet meer. Eerder opgeslagen of gedownloade back-upbestanden op de iPhone kunnen **niet** stilzwijgend worden gewijzigd of verwijderd; die moet de gebruiker zelf vervangen of wissen.

## Technische controle

- Cloudflare-upload gelukt, Workers-subdomein ingeschakeld, broncode exact teruggelezen.
- V8, V7, V6 en goedgekeurd R20 onveranderd gebleven.
- Gesimuleerde database-test met twee gepubliceerde records, gekoppelde en niet-gekoppelde concepten, gedeelde en niet-gedeelde foto-/audio-objecten: doelrecord en gekoppeld concept verdwijnen, overige groepen en gedeelde media blijven bewaard.
- Orphan sweep met eerder verwijderd record getest: verwijdert alleen gekoppelde verweesde conceptgroep.
- Syntax van script gecontroleerd en het exacte startanker in de oorspronkelijk door R20 gebruikte editor als één voorkomen bevestigd.
- **Browser-end-to-end en iPhone-test nog nodig**. Een nieuwe workers.dev-host is een andere origin en heeft eigen opslag; de V8-achterblijver op de screenshot wordt niet vanzelf op V9 bereikbaar.

## Gebruikerstest

1. Test op **V9** met één nieuwe, kleine proefherinnering (een foto is voldoende) om de verwijderactie te controleren.
2. Open via potloodje, klik Verwijderen, bevestig; check in Mijn leven dat herinnering weg is.
3. Open daarna `/tell` opnieuw en kijk dat 'Jouw herinneringen' dit verwijderde bewerkconcept niet meer toont.
4. Voor de al eerder verwijderde herinnering **op V8** kun je de bestaande **×** op het conceptkaartje gebruiken; die ruimt de resterende editorfoto's op, zonder V8-broncode te overschrijven.
