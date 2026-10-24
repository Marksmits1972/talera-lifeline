# TALERA PWA V48 — herstel gewone mediaweergave

Datum: 24 oktober 2026  
Status: geïsoleerde PWA-testversie, nog geen fysieke iPhone-acceptatie  
Bestaand PWA-testadres: `https://talera-pwa-story-player-v47-id-test.mark-a39.workers.dev/`  
Extra preflight: `https://talera-pwa-normal-media-v48-test.mark-a39.workers.dev/`

## Gebruikersopdracht

Herstel de complete normale PWA vóór een nieuwe Story Player wordt ontworpen. Foto's en video's mogen worden toegevoegd en handmatig bekeken; er hoeft geen audiogestuurde fotowissel plaats te vinden. Telefoons krijgen kleine foto-voorvertoningen en video's tonen eerst een stilstaand voorbeeld met afspeelknop; de volledige originelen moeten afzonderlijk behouden blijven. De screenshot met `IMG_2199.mov` liet een ten onrechte afgedwongen limiet van 95 MB zien.

## Wijzigingen (alleen `/tell` en `/present`)

- V46 complete PWA als bestaande basis; V47-patch bewaart stabile media-ID's en compatibiliteit met bestaande opnames, maar V48 schakelt de Story Player-fotoklok expliciet uit.
- Normale tikbediening van de RH19-presentatie terug, ook wanneer een opname bij de herinnering hoort. Handmatige fotoverplaatsing blijft gescheiden van afspelende stem.
- Oude harde grens van **95 MB voor video** verwijderd, zowel in de eerste importer als de beide `TaleraMemories.save` implementaties op de vertel-/presentatiepagina. JPEG/foto-/spraakveiligheidsgrenzen blijven ongewijzigd. Bestandgrootte is nog gebonden aan beschikbare browser-opslag op het toestel.
- Fotominiaturen maximaal 720 px in de bestaande conceptuploader. De bestaande 1440-px telefoonkopie voor definitieve presentatie blijft aanwezig. **Originele bestanden blijven opgeslagen** in IndexedDB; de kopie vervangt die niet.
- Video's tonen een klein posterbeeld met playknop. De teller gebruikt `preload=metadata` om een kleine screenshot te maken; het volledige bestand wordt pas als video afgespeeld na een expliciete tik. Waar decoding niet beschikbaar is, wordt een lichte standaardposter weergegeven.
- Gegenereerde thumbnails voor concepten worden afzonderlijk in IndexedDB bewaard. Bij publicatie wordt de video-poster apart opgeslagen als `<media.key>:poster-v1`; opslag van de poster is best effort, niet de voorwaarde voor het bewaren van het origineel.
- In de presentatie wordt het opgeslagen posterbeeld getoond als de video geselecteerd is, terwijl het videoplayer-element nog `preload=none` en `paused=true` heeft. De echte video start met de eigen playknop. Op de volgende foto verdwijnt de poster en de speler.

## Tests in Cloudflare Browser Rendering

1. De oude 95 MB-regel met een synthetische File met 141-MB-groottemetadata getest: importer weigert niet en normale video-preview heeft playknop. Dit is **geen echte 141-MB-browserquota-test**.
2. Het originele MOV-Blob is byte-voor-byte als oorspronkelijke file opgeslagen; JPEG-video-poster als afzonderlijke Blob met andere key. Beide uit IndexedDB teruggelezen.
3. De normale presentatie met drie echte PNG-bestanden én audio+oude fotocues: audio `currentTime` wijzigen houdt foto 1 en de eerste stip vast; normale tik wisselt naar foto 2 en tweede stip. Alles met daadwerkelijk gedecodeerde `naturalWidth`.
4. Bij geselecteerde video toont RH19 posterafbeelding 46 px breed als `blob:` vanuit de opgeslagen JPEG, eigen playknop aanwezig, video `preload=none` en `paused=true`.
5. Met werkelijk door Chromium MediaRecorder gegenereerde WebM als importbestand: screenshot gedecodeerd, `blob:`-URL van preview, afspeelknop zichtbaar. Geen video nodig om poster te zien.
6. `/`, `/tell`, `/present` en `/normal-pwa-health` zijn bereikbaar in de bestaande PWA-testomgeving en vertellen de verwachte V48-build.

## Behoud en terugdraaien

- V48 werd eerst getest op afzonderlijke Worker `talera-pwa-normal-media-v48-test`.
- Volledige voorgaande V47.3-scriptbackup werd als `talera-pwa-story-player-v47-3-backup-20261024` opgeslagen vóór de bestaande V47-Worker werd bijgewerkt.
- De bestaande test-origin bleef gelijk; er is geen IndexedDB-migratie of wissen van herinneringen uitgevoerd. De bestaande V46-testworker en een eventuele productie-Worker zijn niet aangepast.
- Scriptbron: `src/pwa-normal-media-v48-patch.mjs` op branch `feature/story-player-v47-id-cues-test-20261023`.
- Alleen data uit hetzelfde browser-profiel en dezelfde web-origin zijn direct zichtbaar. Safari, geïnstalleerde PWA of een in-app-browser kunnen afzonderlijke opslagcontainers hebben.

## Niet geclaimd of nog te testen

De gebruiker moet een echte `IMG_2199.mov` vanaf de eigen iPhone importeren. Een origineel boven de vroegere 95 MB wordt nu niet door een kunstmatige grens afgewezen, maar **de iPhone moet voldoende lokale IndexedDB-opslag hebben**. Bestanden zijn momenteel lokaal op dit toestel opgeslagen, zonder cloud-backup. Een foto of video mag niet als 'veilig bewaard' worden geclaimd indien die opslag mislukt. De daadwerkelijke Apple Safari-videocodec, posterextractie, iOS-quota, handmatige video-playback en installatiegedrag zijn nog niet op fysieke hardware bevestigd. Nieuwe Story Player-functionaliteit valt buiten deze V48 opdracht.
