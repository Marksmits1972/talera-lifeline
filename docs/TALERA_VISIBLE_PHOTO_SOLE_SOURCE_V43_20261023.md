# TALERA – Foto leidend, puntjes volgen (V43, 23 oktober 2026)

## Gebruikersbeslissing

**Niet de puntjes sturen, maar de werkelijk zichtbare foto.** De tijdstempels die tijdens het inspreken worden vastgelegd zijn opgeslagen als `{t,index}` in `narrationCues`. Elk indexnummer verwijst naar het geordende `items`-overzicht van diezelfde herinnering; elk item heeft een bibliotheekbestandssleutel `key`. Tijdens het afspelen worden de tijdstempels dus eerst herleid tot het werkelijke media-item en zijn foto-URL. De stemopname is de enige tijdklok. Er is geen aparte tijdklok voor de oranje punten.

## Juiste moderne PWA – proefversie

- Afzonderlijke Worker `talera-pwa-visible-photo-v43-test`, gebaseerd op de moderne TALERA PWA V42 (niet het oudere tijdlijnprototype V22).
- Test: https://talera-pwa-visible-photo-v43-test.mark-a39.workers.dev/tell
- Presenteren via dezelfde origin op `/present`.
- Gezondheidscontrole: `/story-player-health` (V43).
- Runtime: `window.__taleraStoryPlayer.version === 'v43-visible-photo-only'`.
- Eerdere Cloudflare-versies en main-productie ongemoeid; nieuwe Workers-origin deelt niet automatisch lokale Safari-opslag met eerdere versies.

## Wat daadwerkelijk is gewijzigd

1. De oude `renderDots(memory)` maakte het volgende puntje oranje zodra `memory._photoIndex` veranderde, onafhankelijk van het echte beeld. **Verwijderd.**
2. De nieuwe `renderDots(memory)` leidt het actieve puntje alleen af uit de `currentSrc` van het bestaande RH19-voorgrondbeeld `#photoLayerA .example-photo`, mits het echt is geladen (`complete` en `naturalWidth>0`) en de laag zichtbaar is. Bij video wordt eerst gewacht totdat de bestaande videolaag echt geladen/zichtbaar is.
3. De ene `showPhoto(memory,index)` controleert de opgeslagen mediasleutel `frame.key`, bereidt die afbeeldingsbron voor, en zet daarna de `src` van het **bestaande RH19-image-element**. Pas bij het laad-event van dat werkelijke schermbeeld wordt `memory.image` / `memory._photoIndex` bevestigd. Dan volgen de gewone presentatielagen en de oranje stip.
4. De audioklok roept altijd dezelfde fotoselectiefunctie aan voor zijn huidige tijdstempel. Deze functie dedupliceert identieke actieve/pending verzoeken. De audioklok maakt geen punten actief.
5. Bij ontbrekende of niet geladen foto blijft de vorige zichtbare foto en het bijbehorende oranje puntje actief. Verouderde laadaanvragen worden genegeerd; een vastgelopen aanvraag krijgt time-out en kan opnieuw worden geprobeerd.
6. Geen nieuw fotoscherm, foto-overlay of mediaopslag. De oude bibliotheek, stemopnames en de handmatige tikbediening zijn behouden.

## Test: de exacte eerder gemelde fout nagebootst

Bij beide Workers is de echte `.example-photo` opzettelijk verhinderd om van foto 1 naar foto 2 te wisselen. De audioklok vroeg intussen foto 2 aan.

| Gemeten (nulpunt: foto 1) | V42 | V43 |
|---|---|---|
| Bij opname-cue voor foto 2 | Index 2 | Index 1 |
| Werkelijk weergegeven foto | Foto 1 | Foto 1 |
| Oranje punt | **2 – fout** | **1 – correct** |

**Bewijs:** V42 kon de punt vooruitsturen zonder een beeldwissel; V43 kan dat niet. Beide resultaten kwamen uit dezelfde automatische browsertest met bewaarde PNG's en WAV via `TaleraMemories.save`.

## Test: alle foto's volgen in de juiste volgorde

Zes originele testfoto's plus één geluidsbestand met zes opgeslagen fototijdstempels. Tijdsposities: 0,13 / 0,83 / 1,53 / 2,23 / 2,93 / 3,63 / 0,13 / 3,63 s. Bij alle acht stappen was de werkelijk getoonde foto-ID gelijk aan het bijbehorende oranje punt: 1, 2, 3, 4, 5, 6, 1, 6. Alle beelden waren daadwerkelijk geladen. Geen nieuwe opslagstructuur geïntroduceerd.

## Nog te accepteren

- Tests zijn met synthetische PNG/WAV op mobiel formaat in browser-rendering uitgevoerd; **een echte iPhone/Safari-acceptatietest is noodzakelijk** voordat deze als productierijp wordt aangemerkt.
- Deze Workers-origin heeft een eigen lokale Safari/IndexedDB-opslag. Gebruik voor de test nieuwe foto's; verwijder oude proefapps niet.
- De huidige `narrationCues` bewaren de **index** naar de in dezelfde herinnering opgeslagen en op volgorde gehouden `items`; bij toekomstige wijzigingen in die itemvolgorde moet de verwijzing naar de bestandsleutel blijvend kloppen. Dat is een aandachtspunt voor de latere canonieke bibliotheekarchitectuur.
