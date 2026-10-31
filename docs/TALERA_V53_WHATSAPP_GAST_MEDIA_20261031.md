# TALERA — V53 WhatsApp-ontvanger: eerste afhechting media (31 oktober 2026)

## Door gebruiker bevestigde bouwvolgorde
1. Eerst openen vanuit WhatsApp naar uitsluitend de gekozen herinnering met exact de juiste foto, verhaaltekst, gesproken audio, video en sociale interacties; visueel in de bestaande TALERA-presentatiestijl.
2. Daarop iPhone-acceptatie uitvoeren en ontbrekende functionaliteit corrigeren, met behoud van de fotoband, menus, accountomgeving en huidige stagingversie.
3. Pas na volledige acceptatie: eenmalige uitnodigingspop-up (10 seconden, nooit midden in audio/video; geschreven tekst mag wel), TALERA-logo naar commerciële pagina en commerciële TALERA Free-pagina. Free-knop mag tijdelijk nog niet werken.

## In deze V53-bronbranch gebouwd (nog niet in staging gedeployed)
- Eén video per gedeelde herinnering als optionele aanvulling op bestaande foto en geluid; niets verschijnt zonder werkelijk geüploade video.
- /api/shares/:id/video accepteert via eigen TALERA-accountsessie en eigenaarscontrole op dezelfde origin alleen video/mp4, video/quicktime en video/webm, max 25 MB, controle op minimale bestandsheader.
- /gedeeld/:token/video controleert dezelfde geldige, niet-ingetrokken share-token en levert videobytes met HTTP Range/206 voor mobiel kunnen doorspoelen. Geen toegang tot andere mediabronnen of herinneringen.
- Ontvanger ziet conditioneel 'Bekijk video'; speler opent boven de ene herinnering, met sluitknop terug naar de foto; geen autoplay.
- Uploader hergebruikt de geselecteerde herinnering en deelt foto, geluidsopname en video via dezelfde tijdelijke uitnodiging; bij mislukte upload wordt uitnodiging ingetrokken.
- Intrekken verwijdert nu ook de tijdelijke video naast foto en geluid.
- De losse presentatietemplate en de embedded Worker-template zijn gelijk gehouden.

## Broncontrole
- Module-syntaxcontrole voor Worker en UI.
- 12 gerichte broncode-invarianten gecontroleerd: template-identiteit, validatie, token-scope, revocation, video-uploadautorisatie, 25 MB limiet, byte ranges, rollback, videovenster en geen autoplay.
- Dit is GEEN geslaagde echte end-to-end WhatsApp- of iPhone-test en bewijst niet dat alle mogelijke videoformaten daadwerkelijk afspelen.

## Nog te bouwen/valideren VOOR commerciële pop-up of logo
- Werkelijke foto/OG-kaart in nieuwe WhatsApp-uitnodiging visueel accepteren; niet WhatsApp cache van oude link gebruiken.
- Controleren of TALERA-runtime de gekozen video werkelijk als videoUrl/videoSrc/clipUrl of video.src/url beschikbaar stelt; zo nodig bronschema-adapter aansluiten. Audio ook met echt bronbestand testen. Video >25 MB vraagt later een streaming/uploaddesign.
- Video-open/sluit op echte iPhone, audio-opname spelen en intrekken/verlopen van media testen.
- Gasten zonder TALERA-account moeten hartjes kunnen geven en met alleen een voornaam reageren. In V52 vraagt sociale route nog om een account; deze afspraak is **nog niet gebouwd**. Geen extra accountdatabase of losse berichtenbox; behoud centrale herinnering en melding aan eigenaar.
- Geen productie/staging-Worker vervangen zonder de bijbehorende D1/R2-bindings en regressies te controleren; geen bestaande database migreren of wissen zonder passend akkoord.
- Na acceptatie bouwen: eenmalige pop-up na 10 seconden als geen audio/video loopt (foto, geschreven verhaal en socials toegestaan); altijd sluitbaar; logo naar aparte commerciële landingspagina van bestaande TALERA-website; terugknop naar dezelfde herinnering; TALERA Free CTA mag tot integratie eerlijk als 'binnenkort' blijven.

## Ongewijzigd
De eerdere goedgekeurde PWA, tijdlijn, sociale balk en website blijven ongewijzigd. Deze V53-branch is een gecontroleerde ontwikkelstap.
