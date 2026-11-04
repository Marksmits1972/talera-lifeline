# TALERA V7 — fotostrip-foto-isolatie

**Testlink:** https://talera-v61-r20-fotostrip-isolatie-v7-20261104.mark-a39.workers.dev/present

**Nieuwe, volledig aparte Worker:** `talera-v61-r20-fotostrip-isolatie-v7-20261104`  
**Versie:** `2e0b30d7-af76-4f42-bd2c-7bcd5406afbf`  
**GitHub branch:** `dev/r20-fotostrip-isolatie-v7-20261104`  
**Basis:** ongewijzigde V6, via Cloudflare servicebinding `V6_BASE`

## Eén specifieke correctie

In `settleVisiblePhoto(memory)` van de bestaande presentatiecode werd de afbeelding van de **actieve herinnering** niet alleen getoond op diens eigen fotoaanzicht, maar met deze regel op **iedere zichtbare fotostrippagina** gezet:

```js
visibleStrip.querySelectorAll('.talera-photo-strip-page')
  .forEach(page=>forceLayerPhoto(page,src,1));
```

V7 verwijdert uitsluitend het bijbehorende blok uit de opgevraagde HTML. De naastgelegen fotostrippagina's blijven vervolgens met hun eigen eerder toegekende geheugenfoto staan.

De volgende bestaande functies blijven ongewijzigd:

- `runtime.settlePhoto(memory)`
- `forceLayerPhoto(photoLayerA)` en `forceLayerPhoto(photoLayerB)` van de actieve herinnering
- `syncTaleraStoryFrame(memory)` (de presentatie van de eigen vertelfoto)
- swipe, timeline-jump, verhaaltiming, audio, opslag, editor, potlood en verwijderen
- merkstijl, R20-achtergrondvervaging en kleurovergangen

**Dit is nadrukkelijk geen wijziging van de opslagstructuur.** Eén gepubliceerde eigen ingesproken herinnering is nu al één record met intern gekoppelde media en vertel-tijdcodes. De vreemde datums op de tijdlijn behoren aan de bestaande automatisch gegenereerde stresstestverhalen.

## Controle

- Cloudflare-Worker nieuw gepubliceerd en exact teruggelezen; source exact gelijk aan GitHub-versie.
- Bronscript V56 bevatte exact **één** voorkomen van het verdachte blok.
- Testtransformatie op de V56-bron laat de actieve presentatielagen en `syncTaleraStoryFrame()` intact.
- Synthetische JavaScript-functietest, uitgevoerd met drie naastgelegen fotostrippagina's:
  - **vóór correctie:** alle drie krijgen ten onrechte de foto van de actieve herinnering
  - **na correctie:** drie naburige foto's behouden hun eigen afbeelding, terwijl de actieve laag de huidige foto krijgt.
- V6, V5, goedgekeurde R20 en oorspronkelijke vertrouwde staging zijn onveranderd op hun vorige versies.
- **Nog niet op echte iPhone getest.** De werkcontainer en web-fetch kunnen de workers.dev-host niet openen (DNS/toegangsbeperking), dus de daadwerkelijke end-to-end route en het swipegedrag vragen een gebruiker-test. De responseheader `x-talera-v7-photo-strip-fix` rapporteert `active` als de runtime-vervanging daadwerkelijk heeft plaatsgevonden en `anchor-unmatched` anders. In het laatstgenoemde geval laat V7 de bestaande pagina ongemoeid in plaats van te blokkeren.

## Test voor iPhone

1. Open V7 op de nieuwe link en maak één **eigen** ingesproken herinnering met twee of drie foto's (of gebruik een bestaande eigen herinnering op diezelfde oorsprong).
2. Open deze herinnering in de presentatie en swipe daarna door de andere datums.
3. Kijk of naburige datums hun eigen beeld behouden en of het potlood blijft verwijzen naar de juiste eigen herinnerings-ID.
4. Als de herhaling blijft, noteer wat de datum bovenaan zegt en of er ondertussen `Test 44x` verschijnt; dit kan wijzen op een tweede losstaand render- of swipeprobleem.

**Let op:** omdat deze V7-host een nieuw domein is, wordt lokale IndexedDB-inhoud van V6 niet automatisch gedeeld. Kopieer of migreer privégegevens niet automatisch; maak een lokale back-up voor destructieve tests.
