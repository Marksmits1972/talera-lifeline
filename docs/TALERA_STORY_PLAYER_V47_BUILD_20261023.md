# TALERA Story Player V47 — geïsoleerde bouw en eerste acceptatieproeven

**Datum:** 23 oktober 2026  
**Status:** TESTKANDIDAAT, niet vrijgegeven voor productie  
**Bron:** moderne Cloudflare PWA `talera-pwa-recording-clock-v46-test` (ongewijzigd)  
**Nieuwe Cloudflare Worker:** `talera-pwa-story-player-v47-id-test`  
**Test-URL:** https://talera-pwa-story-player-v47-id-test.mark-a39.workers.dev/  
**GitHub-code:** `src/story-player-v47-patch.mjs` op branch `feature/story-player-v47-id-cues-test-20261023`

## Doel en scope

Klein geïntegreerd Story Player-onderdeel; behoud alle bestaande pagina's, vernieuwde presentatie, foto-/video-werkbladbediening, mediahistorie en algemene navigatie. Er is géén tweede bibliotheek, sorteermodule, presentatie-engine of aparte Worker voor de oorspronkelijke opslag.

De test-Worker is rechtstreeks gebaseerd op de bestaande V46 Worker. De in GitHub vastgelegde V47-postprocessor grijpt alleen in op de uiteindelijke `/tell`- en `/present`-HTML, ná de eerdere V20- en andere bundeltransformaties. De postprocessor stopt met een gecontroleerde fout als een vereiste patchlocatie ontbreekt; hij voert niet stilzwijgend een gedeeltelijke upgrade uit.

## Wijzigingen

1. Een nieuw opgenomen verhaal bewaart markers `{t, mediaId}` in plaats van `{t,index}`.
2. Media-items bewaren hun eigen ID naast hun IndexedDB-bestandssleutel. De bestandsnaam wordt niet meer bepaald door de mediapositie.
3. Bestaande media-identiteiten worden tijdens openen/bewerken en het opslaan van een concept doorgegeven, ook na herschikken.
4. De opslag valideert markers aan de hand van de media-ID's die werkelijk onderdeel van de herinnering zijn.
5. Afspelen leidt de gewenste media direct af van `audio.currentTime` en `mediaId`. Ontbrekende markers leiden niet langer tot automatisch over de audio verdeelde beelden.
6. De bestaande RH19/modern-PWA-fotoweergave en zijn zichtbaarheidscontrole blijven verantwoordelijk voor foto- en indicatorweergave. Er komt geen tweede zichtbare fotolaag.
7. Video blijft na zijn eigen einde zichtbaar in dezelfde beeldruimte tot een volgende opgeslagen cue een nieuwe mediawisseling voorschrijft.
8. Herstart vanaf het begin gebruikt de eerste marker-ID en niet de laatste geselecteerde index.
9. Oudere indexgebaseerde opnames worden niet automatisch geconverteerd of gegokt; daarvoor blijft een afzonderlijke compatibiliteitsbeslissing nodig.

## Bewijs: uitgevoerde tests met synthetische media

Alle tests in afzonderlijke Cloudflare Browser Rendering-context, zonder persoonlijke media en zonder publicatie naar productie.

| Test | Resultaat |
| --- | --- |
| Nieuwe Worker upload/deployment | Geslaagd; Cloudflare API HTTP 200, eerste versie actief |
| workers.dev testsubdomain | Ingeschakeld |
| `/story-player-v47-health` | Geslaagd; identificeert V47 en V46-basis |
| `/tell` render + JS-runtime | Geslaagd; echte pagina toont V47-identifier en `TaleraMemories` |
| `/present` render + JS-runtime | Geslaagd; echte pagina toont V47-identifier en bestaande `#photoStage` |
| Drie PNG's en één WAV opslaan | Geslaagd; drie `{t,mediaId}`-markers, vier bestanden aanwezig |
| Bij dezelfde herinnering media herordenen en opnieuw opslaan | Geslaagd; volgorde veranderd, markers, media-ID's, audio-ID en bestanden behouden |
| Zes PNG's met zes media-ID-markers opslaan | Geslaagd; zeven bestanden inclusief audio en alle zes markers aanwezig |
| Foto, media-item van type video, foto, WAV | MIME-/opslagcontract geslaagd; video-ID blijft correct, bestand onveranderd |
| Rendered presentatiecode controleren | Geslaagd; ID-lookup aanwezig, automatische fallback verdwenen, laatste-videobeeld-regel aanwezig |

**Belangrijke beperking video-opslagtest:** het gebruikte `video/webm`-bestand was een 12-byte opslagfixture, géén afspeelbaar videobestand. Alleen opslag en verwijzing zijn getest, niet decodeerbare videoweergave.

## Nog NIET geslaagd/NIET uitgevoerd

- Test A in zijn geheel: zes werkelijk zichtbare en audiogesynchroniseerde foto's met visuele verificatie.
- Tests B en C: een echte afspeelbare iPhone-video tussen foto's, inclusief op tijd verlaten en laatste videobeeld.
- Test D: de volledige reeks beëindigen en vanaf nul herstarten in het echt.
- Test E: klik/tikgedrag op de daadwerkelijke Story Player tijdens afspelen.
- Test F: opzettelijk vertraagd/onleesbaar mediabestand en de oranje indicator visueel controleren.
- Test G: daadwerkelijk op een iPhone een gesproken verhaal opnemen, de PWA sluiten/heropenen en afspelen.
- De uitwerking van pauzetijd onder mobiele Safari met een echte MediaRecorder-opname.
- Compatibiliteit van reeds opgeslagen indexgebaseerde opnames. Die zijn niet geconverteerd.
- De volledige V46 Worker is nog niet als reproduceerbare, actuele GitHub-bundel opgeslagen; de exacte code is wel als ongewijzigde Cloudflare-basis aanwezig en de V47-delta staat in GitHub.

## Veiligheidsgrenzen

- Alleen aparte test-Worker en aparte GitHub-branch aangepast.
- Geen wijzigingen aan V46, oudere Workers, primaire GitHub-branch, Drive of persoonlijke herinneringen.
- De nieuwe `workers.dev`-origin heeft eigen browseropslag. Foto's uit oudere testlinks zijn daar niet automatisch aanwezig.
- Alleen testherinneringen gebruiken voor de verdere acceptatieronde.
- Geen promotie naar productie zonder afzonderlijk akkoord.

**Eerstvolgende stap:** echte iPhone-test met zes foto's, afspeelbare video en echte stemopname. V47 blijft een testkandidaat tot alle relevante weergave- en heropenproeven aantoonbaar slagen.

## Correctie V47.1 — 23 oktober 2026, naar aanleiding van iPhone-feedback

**Door gebruiker bevestigd probleem:** op de foto's tikken schakelde ongewenst door; tijdens gesproken afspelen bewogen foto's niet mee. De aanvankelijke V47 acceptatie was te beperkt: uitsluitend opslag en HTML-structuur waren toen getest.

**Aangetroffen technische oorzaken/risico's:**

- De V47-opslagpatch was alleen toegepast in de uiteindelijke `/tell`-pagina. `/present` bevatte nog de oude `safeCues(value,count)` en positionele mediasleutels. Een nieuwe foto/audio-marker die langs die code liep werd weggefilterd: een echte browsertest leverde `narrationCues: []` en `local-ID:0`-items op.
- De V46 klikonderdrukking op `#photoStage` dekte niet noodzakelijk het hele `#memoryStoryScroll`-fotopaneel of alle pointer-/touch-gebeurtenissen.
- De afspeelfunctie accepteerde alleen nieuwe media-ID-cues en niet expliciet opgeslagen oudere indexcues. Beide mogen geldig blijven, maar ontbrekende cues mogen niet automatisch verdeeld worden.

**Uitgevoerde correctie op dezelfde test-Worker** `talera-pwa-story-player-v47-id-test`:

1. Identieke media-ID-opslag en cuevalidatie in de uiteindelijke vertel- én presentatieroutes.
2. Correcte ID-validatie ook bij tekst-/metadata-aanpassingen aan bestaande herinneringen.
3. Audio `currentTime` selecteert vastgelegde `mediaId`; bestaande echte `{t,index}`-markers zijn als compatibiliteit ondersteund zonder zelf tijdstempels te verzinnen.
4. Alleen in een lokale herinnering mét opname/markers wordt een tik geblokkeerd, via window-capture op het hele fotopaneel. Werkelijke knoppen en veegbewegingen blijven buiten dit tapfilter.

**Nieuwe browserproeven met kunstmatige foto's en werkelijke lopende WAV:**

- Drie foto's bij handmatige audiosprongen: op 1,35 s werkelijk foto 2 zichtbaar, op 2,7 s werkelijk foto 3; natuurlijke beeldbreedte positief en media-ID's gelijk aan cues.
- Zes foto's met echte lopende vijf-seconden-WAV (muted voor headless autoplay). Op 1,09 s: geselecteerde/zichtbare foto 2, oranje puntje 2. Op 3,49 s: foto 5, oranje puntje 5. Audio speelde door.
- Tijdens die run kwam op 3,6 s vanzelf de laatste cue; deze overgang is **niet** als tapfout geteld.
- Afzonderlijke inputtest zonder tijdsverloop: `click` op `#photoLayerA .example-photo`, `click` op `#memoryStoryScroll` en `pointerup` op foto worden verhinderd; een echte bedieningsknop blijft toegankelijk (alle vier assertions geslaagd).
- De bestaande Cloudflare service worker gebruikt netwerk-eerst navigatie zonder eigen HTML-cache. Het nieuwe testadres gebruikt `cache-control: no-store` voor de vertel- en presentatiepagina's.

**Nog steeds open:** fysieke iPhone/Safari-acceptatie van microfoon, cues tijdens opname, echte video, pauze/hervat, visuele animaties en heropenen van de PWA. Er is geen productie-release uitgevoerd. De gebruiker moet de bijgewerkte test-PWA echt herladen; bestaande audio-opnames zonder opgeslagen cues kunnen niet betrouwbaar worden gereconstrueerd.

**GitHub-code:** `src/story-player-v47-patch.mjs` (V47.1), commit `c7cb33ba3e86bdadd3650625d2223659c4cbb37f`. **Cloudflare:** bestaande geïsoleerde test-Worker opnieuw geüpload, HTTP 200 (23 oktober 2026 14:19 UTC).
