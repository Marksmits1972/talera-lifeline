# TALERA – V41 directe fotoklok, moderne PWA (23 oktober 2026)

## Correcte applicatiebasis

**Dit is niet het oude tijdlijnprototype V22.** De nieuwe fotoklok is in een nieuwe Cloudflare Worker gebouwd als afsplitsing van **`talera-pwa-story-player-v39-test`** (moderne PWA, titel `TALERA · My life`, bestaande routes `/tell` en `/present`).

- Bron / veilige terugvalversie: `talera-pwa-story-player-v39-test.mark-a39.workers.dev`
- Nieuwe zelfstandige **acceptatietest**: https://talera-pwa-photo-clock-v41-test.mark-a39.workers.dev/
- Worker: `talera-pwa-photo-clock-v41-test`
- Build-identificatie in `/present`: `window.__taleraStoryPlayer.version === 'v41-direct-photo-clock'`
- Alleen de presentatiecontroller van de nieuwe Worker is aangepast. Bestaande versies blijven intact.
- **Let op:** het oudere `/story-player-health`-endpoint bevat nog V39-informatie; dit is een overgenomen diagnostische string. Gebruik de build-identificatie op `/present` voor controle.

## Eén aansturing

**Tijd in stemopname → index/tijdcode → media-ID & foto-URL uit de bestaande bibliotheek → foto geladen op bestaande RH19-`#photoStage` → oranje puntje volgt.**

De `showPhoto(memory,index)`-controller van de moderne PWA is vereenvoudigd. Een foto wordt vóór de zichtbare wijziging met een `Image` op laadbaarheid gecontroleerd. De geheugenstatus `memory.image` en `memory._photoIndex` veranderen alleen na succesvolle voorcontrole. De bestaande RH19-fotolagen worden vervolgens aangestuurd via de bestaande `settleVisiblePhoto(memory)`; `renderDots(memory)` volgt in het volgende animation frame. Er bestaat **geen aparte synchronisatie of tijdklok voor de puntjes**.

Een korte `photoSeq`-beveiliging verwerpt verouderde laadaanvragen bij doorspoelen/andere herinneringen. Een reeds wachtende aanvraag voor dezelfde foto wordt niet iedere 80 ms opnieuw opgestart. Bij ontbrekende of onleesbare foto blijft de laatst zichtbare foto én diens puntje staan, met een zichtbare foutmelding.

**Verwijderd:** `syncTaleraStoryFrame` en de extra `.talera-story-synced-photo`-overlay en bijbehorende oproepen. De bestaande `#photoStage` blijft het enige zichtbare fotoscherm.

**Gewijzigd:** de bibliotheek-hydratatie vult ontbrekende fotoreferenties niet meer met een andere foto (`frame.url || PLACEHOLDER` in plaats van `frame.url || poster`).

**Niet gewijzigd:** bibliotheek, upload, IndexedDB, stemopname, audio als tijdklok, tijdstempels, bestaande TV-functies of de inhoud van eerder opgeslagen herinneringen.

## Uitgevoerde functionele browsertests

In een schone browseromgeving op de **echte V41 Worker**:

- Drie verschillende PNG-originelen (rood, groen, blauw) en één WAV-opname opgeslagen via `TaleraMemories.save`, met fototijden 0, 1.000 en 2.000 ms.
- De nieuwe herinnering geladen via `/present?memory=<id>`.
- Bij afspeeltijd 0,20 s verschijnt daadwerkelijk rood (RGB 239,19,39), zichtbaar puntje 1.
- Bij afspeeltijd 1,35 s verschijnt daadwerkelijk groen (RGB 21,219,69), zichtbaar puntje 2.
- Bij afspeeltijd 2,55 s verschijnt daadwerkelijk blauw (RGB 20,69,246), zichtbaar puntje 3.
- De pixels zijn uit de werkelijk weergegeven RH19-fotolaag gelezen; alle afbeeldingen hebben een geldige `naturalWidth` en komen overeen met de geselecteerde mediareferentie.
- Er bestaat geen extra overlay `.talera-story-synced-photo`.
- Een opzettelijk ontbrekende foto 2 laat foto 1 en puntje 1 staan met de foutmelding **“Foto 2 ontbreekt in de bibliotheek.”** Bij doorspoelen naar foto 3 verschijnt foto 3 en puntje 3. Terugspoelen naar het begin herstelt foto 1 en puntje 1.
- `/tell`, `/present` en de diagnostische route renderen zonder Cloudflare-fout 1101.

## Openstaande acceptatiepunten

Dit is **geen definitieve iPhone-goedkeuring**. De browsersimulatie gebruikt kleine PNG's en WAV in plaats van echte grote iPhone-foto's en een echte microfoonopname. Verifieer op een iPhone bij voorkeur drie zeer verschillende eigen foto's, een korte opname, handmatige fotowisselingen, terugspoelen, sluiten en heropenen.

Omdat de nieuwe `workers.dev`-naam een **andere browser-origin** heeft, is de lokale bibliotheek uit V39 niet automatisch beschikbaar in V41. **Verwijder oude testinstallaties of bestanden niet.** Gebruik nieuwe testbestanden op V41. Er is geen automatische cloudback-up.

Promoveer V41 pas als de echte iPhone-test bevestigt dat de foto's werkelijk correct in de juiste volgorde zichtbaar worden.
