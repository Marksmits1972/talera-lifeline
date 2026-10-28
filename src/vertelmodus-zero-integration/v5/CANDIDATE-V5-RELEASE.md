# TALERA V5 — rustige Vertelmodus en zichtbare videovoorvertoning

**28 oktober 2026 — nieuwe testkandidaat, geen goedgekeurde productieversie.**

## Afgeschermde basis
- Vorige V4 Worker: `talera-pwa-werkblad-schrijf-v4-test`, deployment `675a53e8-3552-4750-9833-1c2a13949739`; niet veranderd.
- Vorige V3, V2 en zero-integrated basissen blijven behouden.
- Nieuwe Worker: `talera-pwa-vertel-eenvoud-v5-test`.
- V5 testlink: https://talera-pwa-vertel-eenvoud-v5-test.mark-a39.workers.dev/tell
- V5 Cloudflare deployment: `34cd6fad-c289-4d60-8e3f-964672836075`.
- V5 Cloudflare version: `cb6e52a2-c0c2-4100-a116-cd75be353941`.
- GitHub branch: `feature/vertelmodus-rust-video-preview-v5-20261028`.

## Verzoek van eigenaar
De Schrijfmodus leek moeilijk bereikbaar na Vertellen; video (voorbeeld 1/5) leek in de Vertelmodus te verdwijnen na stoppen; de Vertelmodus oogde druk door dubbele/overbodige knoppen en zichtbare randen. Ontwerpuitgangspunt: maximaal één duidelijke primaire actie per toestand, overige bediening alleen indien nodig, media centraal, bestaand swipe/tap-proces intact. De gebruiker wil iteratief op iPhone beoordelen.

## Werkende V5 codewijzigingen
1. **Bestaande videoframes gedeeld**: `/tell` stuurt bij de reeds bestaande `INIT`-boodschap voor ieder beeld dezelfde `previewBlobs` mee die de bewerkpagina al heeft. `refreshPreview(id)` stuurt ook later gegenereerde posters door als `PREVIEW`. Geen extra videosorteerder, opslagdatabase, tijdstempelengine of decoderpool gebouwd.
2. **Permanente voorvertoning als video pauzeert**: `show(n)` in de zelfstandige zero-player maakt bij video een eigen poster-`img` vóór het video-element. De poster komt uit het bestaande previewbeeld; als die ontbreekt verschijnt tijdelijk een neutrale video-placeholder, niet een volledig leeg vlak. `playing` met gedecodeerd beeld verbergt de poster; `pause`, `ended`, `waiting` of video-`error` brengt die terug. `dispose` verwijdert de poster en ruimt de actieve video op. `load(data)` bewaart/revoket poster-blob-URLs binnen de bestaande levenscyclus; bericht `PREVIEW` werkt een poster bij. Opgenomen voice-cues, audioklok en de video-rerun met origineel geluid zijn niet vervangen.
3. **Rustige knoppen afhankelijk van toestand**: `idle` één primaire knop Begin met vertellen; `recording` Stop plus kleine Pauze; `paused` Stop plus Hervat; `ready` Terugkijken plus subtiele Opnieuw; `playing` alleen Pauze; `playPaused` alleen Verder. De vroegere dubbele Terugkijken/Pauze-actie tijdens afspelen is opgelost; pauze hervat de lopende stem in plaats van terugkeren naar het begin.
4. **Grotere beeldruimte**: de iframe-weergave is flex-layout, met media als hoofdelement, een kleine teller linksboven, een dunne status-/tijdregel en een compacte actiezone. Overlays met linker-/rechterpijlen zijn visueel verborgen op mobiel; de bestaande tik-/veeghandlers blijven aanwezig. De buitenste kop is kleiner, met één duidelijke knop `Klaar`. Donkere grote kaders en onnodig veel knopranden verdwijnen. De automatische stem/beeldsynchronisatie zelf is niet gewijzigd.
5. **Naar Schrijven terug**: `Klaar` sluit het vertelscherm, bewaart het bestaande concept zoals voorheen en scrolt de al bestaande bewerkpagina naar de rij `Vertellen / Schrijven`, zodat Schrijven weer direct te zien en te openen is. Schrijven is geen menu in de Vertelmodus; de bewerkpagina blijft de regie houden.

## Browserproeven, 390 × 844 viewport
- PASS: `/`, `/tell`, `/mijn-leven`, `/present`, `/vertelmodus-embed?mode=record`, `mode=present`, `/vertelmodus-health` laden zonder Worker-fouten.
- PASS: met mockvideo plus apart SVG-posterbestand is de poster zichtbaar in terugkijkmodus; `PREVIEW` vervangt de blob-URL zonder de video zelf te vervangen. Alleen Terugkijken en een kleine Opnieuw-knop zichtbaar in `ready`; geen zichtbare navigatiepijlen.
- PASS: na terugkijken wordt met pauze doorgegaan zonder opnieuw te beginnen: `ready → playing → playPaused → playing` met respectievelijk `[play,reset] → [playpause] → [playpause] → [playpause]`.
- PASS: terug via `Klaar` toont bestaande `write` knop en opent de bestaande schrijfmodus.
- PASS: **echt browsergegenereerd VP8/WebM-video-upload** (16.194 bytes) via de bestaande filepicker: thumbnail gegenereerd en zichtbaar in de bewerkpagina, dezelfde blob-poster zichtbaar in de iframe Vertelmodus bij geselecteerde video. Dit is geen iPhone-HEVC-test.
- PASS: synthetisch einde van gesproken verhaal met video-foto-video resulteert nog steeds in twee originele ongedempte videoplayers index 0 en 2 (DOM/event-test, geen bewijs van audio).
- PASS: publiceren met bestaande titel/tekst/datum slaat een proefherinnering op en toont de kaart met bevestiging in `/mijn-leven` (aparte browsersessie).

## Open echte iPhone-proef
Open V5 op iPhone; importeer echte HEVC/MOV-video's en foto's; controleer dat de video zichtbaar blijft voordat je spreekt, tijdens de stille stemopname, na stoppen en bij opnieuw terugkijken; beoordeel gebaren en statusknoppen; toets de echte microfoon, opgeslagen timestamps en terugkeer via Klaar naar Schrijven. Kijk of de extra originele videoronde volledig met geluid speelt; controleer ook pagina-uitlijning met Safari-balk en geïnstalleerde PWA. Vooral iOS autoplay/video-codec en de exacte iPhone UI moeten door eigenaar worden geaccepteerd.

## Bouw/releasebeperking
Afzonderlijke Cloudflare-kandidaat is gedeployed vanuit een kopie van de gecontroleerde historische multipart-bundel. De GitHub-branche bevat geïsoleerde bronpatches en releasenotities, geen volledig reproduceerbare CI-build van de historische volledige PWA. Niet mergen, niet CURRENT vervangen en geen oude Worker verwijderen voor expliciete acceptatie. Afzonderlijke workers.dev-origins hebben ieder hun eigen IndexedDB; eerdere testherinneringen verschijnen niet automatisch in V5.
